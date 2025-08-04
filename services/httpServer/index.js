const Koa = require('koa');
const cors = require('koa2-cors');
const { koaBody } = require('koa-body');
const compress = require('koa-compress');
const helmet = require('koa-helmet');
const http = require('http');
const https = require('http2');
const fs = require('fs');
const favicon = require('koa-favicon');
const Routers = require('./src/routes');
const { private_pkcs1, certificate } = require('./src/diffieHellman.js');
const app = new Koa();
app.env = process.env.NODE_ENV;
class HttpServer {
	constructor(config) {
		this.config = config;
	}
	start(callback) {
		if (!this.config.start) {
			callback && callback();
			return false;
		}
		// app.context.onerror = errorHandler;
		NKGlobal.config.project && app.use(favicon(NKGlobal.config.project.favIcon));
		const routes = new Routers({ ...this.config.routes });
		app
			.use(
				compress({
					filter: function (content_type) {
						return /text/i.test(content_type);
					},
					threshold: 2048,
					flush: require('zlib').Z_SYNC_FLUSH
				})
			)
			.use(koaBody(this.config.bodyparser))
			.use(helmet())
			.use(cors());
		app.use(routes.standardResponse);
		routes.loadProxyRoutes();
		routes.loadMountRoutes();
		routes.loadDynamicRoutes();
		routes.loadStaticRoutes();
		routes.routeExistCheck(app);
		routes.routeAuthCheck(app);
		routes.routeIntercept();
		let conf_http = this.config.protocols.http;
		let conf_https = this.config.protocols.https;
		let services = [];
		if (conf_http && conf_http.start) {
			services.push(
				new Promise((resolve, reject) => {
					http.createServer(app.callback()).listen(conf_http.port, () => {
						console.info(`[httpServer] started at port ${conf_http.port}`);
						resolve();
					});
				})
			);
		}
		if (conf_https && conf_https.start) {
			services.push(
				new Promise((resolve, reject) => {
					!conf_https.key && (conf_https.key = {});
					!conf_https.cert && (conf_https.cert = {});
					let options = {
						key: conf_https.key.value || (conf_https.key.path && fs.readFileSync(conf_https.key.path)) || private_pkcs1,
						cert:
							conf_https.cert.value || (conf_https.cert.path && fs.readFileSync(conf_https.cert.path)) || certificate
					};
					https.createSecureServer(options, app.callback()).listen(conf_https.port, () => {
						console.info(`[httpsServer] started at port ${conf_https.port}`);
						resolve();
					});
				})
			);
		}
		Promise.all(services).then(() => {
			console.info(`httpServer info : PID:${process.pid}  NODE_ENV : ${app.env}`);
			callback && callback();
		});
	}
}
module.exports = HttpServer;
