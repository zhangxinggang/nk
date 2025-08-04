const jwt = require('jsonwebtoken');
const minimatch = require('minimatch');
let getToken = (playload, options) => {
	let security = NKGlobal.config.services.httpServer.security;
	let ops = Object.assign({ expiresIn: security.tokenExpiresIn }, options);
	let token = jwt.sign(playload, security.secret, ops);
	return token;
};
let getTempToken = () => {
	let security = NKGlobal.config.services.httpServer.security;
	let token = jwt.sign({ isTemp: true }, security.secret, { expiresIn: '60s' });
	return token;
};
let verifyToken = async (ctx, next) => {
	let httpServer = NKGlobal.config.services.httpServer;
	let reqUrl = ctx.request.url;
	let security = httpServer.security;
	let noAuth = security.noAuthorityRoutes.some((item) => {
		return minimatch(reqUrl, item);
	});
	if (noAuth) {
		await next();
	} else {
		let projectCookies = require('./cookies');
		let token =
			ctx.request.body?.access_token ||
			ctx.request.query?.access_token ||
			ctx.headers[projectCookies.token] ||
			ctx.cookies.get(projectCookies.token);
		if (token) {
			try {
				let playload = await jwt.verify(token, security.secret);
				!ctx.session && (ctx.session = {});
				!ctx.session.userInfo && (ctx.session.userInfo = playload);
				await next();
			} catch (err) {
				ctx.throw(403, new Error('Token error!'));
			}
		} else {
			ctx.throw(403, new Error('No token provider!'));
		}
	}
};
module.exports = {
	getToken,
	getTempToken,
	verifyToken
};
