const _ = require("lodash");
const glob = require("glob");
const fs = require("fs");
const url = require("url");
const { createProxyMiddleware } = require("http-proxy-middleware");
const koaConnect = require("koa-connect");
const Router = require("koa-router");
const send = require("koa-send");
const methods = require("methods");
const { toUnix, normalizeSafe, join, parse } = require("upath");
const { verifyToken } = require("./authority");
const defaultStr = {
  notFound: "Not Found!",
};
class Routers {
  constructor(options) {
    options = options ? options : {};
    options.routes = [];
    Object.assign(this, options);
  }
  formatterRootPath(item) {
    typeof item.auth == "undefined" && (item.auth = true);
    item.rootPath = normalizeSafe("/" + item.rootPath + "/");
    item.rootDir = join(item.rootDir);
  }
  routeExistCheck(app) {
    app.use(async (ctx, next) => {
      let exist = this.routes.some((item) => {
        return item.stack.some((rt) => {
          let paramMethods = rt.methods.map((item) => item.toLocaleUpperCase());
          if (
            paramMethods.includes(ctx.method) &&
            rt.regexp.test(url.parse(ctx.url).pathname)
          ) {
            if (!rt.nkr_params) {
              return true;
            } else {
              let filePath = join(
                rt.nkr_params.rootDir,
                normalizeSafe(
                  decodeURIComponent(ctx.path).replace(
                    rt.nkr_params.rootPath,
                    "/"
                  )
                )
              );
              try {
                fs.accessSync(filePath);
                return true;
              } catch (e) {}
            }
          }
        });
      });
      if (exist) {
        await next();
      } else {
        ctx.throw(404, new Error(defaultStr.notFound));
      }
    });
  }
  routeAuthCheck(app) {
    this.routes.map((item) => {
      !item.nkr_auth && app.use(item.routes());
    });
    app.use(verifyToken);
    this.routes.map((item) => {
      item.nkr_auth && app.use(item.routes());
    });
  }
  loadProxyRoutes() {
    this.proxyRoutes = this.proxyRoutes || {};
    Object.keys(this.proxyRoutes).forEach((item) => {
      let options = this.proxyRoutes[item];
      if (typeof options == "string") {
        options = { target: options };
      }
      let regexp = new RegExp("^" + item + "[/|?]{1}" + "|^" + item + "$");
      typeof options.auth == "undefined" && (options.auth = true);
      let routes = () => {
        return async function (ctx, next) {
          if (regexp.test(url.parse(ctx.url).pathname)) {
            await koaConnect(createProxyMiddleware(item, options))(ctx, next);
          } else {
            await next();
          }
        };
      };
      let router = {
        routes: routes,
        nkr_auth: options.auth,
        stack: [
          {
            methods,
            regexp,
          },
        ],
      };
      this.routes.push(router);
    });
  }
  loadStaticRoutes() {
    this.staticDirs = this.staticDirs || [];
    this.staticDirs.map((item) => {
      this.formatterRootPath(item);
      let methods = ["HEAD", "GET"];
      let routes = () => {
        let opts = Object.assign({}, item);
        opts.root = opts.rootDir;
        if (opts.index !== false) opts.index = opts.index || "index.html";
        return async function staticServe(ctx, next) {
          let done = false;
          if (methods.includes(ctx.method)) {
            try {
              done = await send(
                ctx,
                normalizeSafe(ctx.path.replace(opts.rootPath, "/")),
                opts
              );
            } catch (err) {
              if (err.status !== 404) {
                throw err;
              }
            }
          }
          if (!done) {
            await next();
          }
        };
      };
      let router = {
        routes: routes,
        nkr_auth: item.auth,
        stack: [
          {
            methods: methods,
            regexp: new RegExp("^" + item.rootPath),
            nkr_params: item,
          },
        ],
      };
      this.routes.push(router);
    });
  }
  loadMountRoutes() {
    this.mountRouteDirs = this.mountRouteDirs || [];
    this.mountRouteDirs.map((item) => {
      this.formatterRootPath(item);
      glob
        .sync(join(item.rootDir, "/**/*.js"), { ignore: item.ignore })
        .map((file) => {
          const controllers = require(file);
          _.forOwn(controllers, (value, key) => {
            const prefix = join(item.rootPath, parse(file).name);
            const router = new Router();
            router["nkr_auth"] = item.auth;
            router.prefix(prefix);
            let handlers = value;
            if (_.isFunction(handlers)) handlers = [handlers];
            if (_.isArray(handlers)) {
              router.get(key, ...handlers);
            } else if (_.isPlainObject(handlers)) {
              _.forOwn(handlers, (funcs, method) => {
                if (_.isFunction(funcs)) funcs = [funcs];
                router[method](key, ...funcs);
              });
            }
            router.stack.length > 0 && this.routes.push(router);
          });
        });
    });
  }
  loadDynamicRoutes() {
    this.dynamicRouteDirs = this.dynamicRouteDirs || [];
    this.dynamicRouteDirs.map((item) => {
      this.formatterRootPath(item);
      const router = new Router();
      router["nkr_auth"] = item.auth;
      glob
        .sync(join(item.rootDir, "/**/*.{m}.*js"), { ignore: item.ignore })
        .map((filterRoute) => {
          let routeType = filterRoute
            .match(/\{(.+?)\}/g)
            .filter((type) => type != "{m}");
          if (routeType.length > 1) {
            console.error(
              new Error(
                filterRoute + ',file name error,only allowed tow "{*}" format!'
              )
            );
          } else {
            !routeType[0] && (routeType[0] = "{get}");
            let method = routeType[0].replace(/\{|\}/g, "");
            let purifyRoute = normalizeSafe(
              toUnix(filterRoute)
                .replace(toUnix(item.rootDir), "/")
                .replace(/\.\{(.+?)\}|\.js/g, "")
            );
            let combinedRoute = join(
              item.rootPath || "",
              purifyRoute,
              item.ext || ""
            );
            router[method](combinedRoute, async (ctx) => {
              try {
                let result = await new Promise((resolve, reject) => {
                  ctx.success = resolve;
                  ctx.error = reject;
                  require(filterRoute)(ctx);
                });
                ctx.formatSuccess(result);
              } catch (err) {
                ctx.throw(500, err);
                // ctx.formatError(err)
              }
            });
          }
        });
      router.stack.length > 0 && this.routes.push(router);
    });
  }
  routeIntercept() {
    const router = new Router();
    router.all("*", (ctx) => {
      ctx.throw(404, new Error(defaultStr.notFound));
      // ctx.formatError([404,defaultStr.notFound])
    });
  }
  async standardResponse(ctx, next) {
    const res = (ctx, data = [], status, msg) => {
      let returnInfo = {
        data,
        meta: {
          status,
          msg,
        },
      };
      ctx.response.body = returnInfo;
    };
    const success = (ctx, data, status = 200, message = "success") => {
      res(ctx, data, status, message);
    };
    const error = (ctx, status, message) => {
      let eStatus = 0;
      let eMessage = null;
      if (Object.prototype.toString.call(status) == "[object Array]") {
        eStatus = status[0];
        if (Object.prototype.toString.call(status[1]) == "[object Error]") {
          eMessage = status[1].message;
        } else {
          eMessage = status[1];
        }
      } else if (Object.prototype.toString.call(status) == "[object Error]") {
        eMessage = status.message;
      } else if (Object.prototype.toString.call(status) == "[object Object]") {
        eStatus = status["status"] || eStatus;
        if (
          Object.prototype.toString.call(status["message"]) == "[object Error]"
        ) {
          eMessage = status["message"].message;
        } else {
          eMessage = status["message"];
        }
      } else {
        if (!message) {
          eMessage = status;
        } else {
          eStatus = status;
          eMessage = message || "error";
        }
      }
      res(ctx, [], eStatus, eMessage);
    };
    ctx.formatSuccess = success.bind(null, ctx);
    ctx.formatError = error.bind(null, ctx);
    await next();
  }
}
module.exports = Routers;
