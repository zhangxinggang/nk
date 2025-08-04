module.exports = {
	'/': async (ctx) => {
		ctx.body = 'Weibos Index';
	},
	'/getArr': [
		async (ctx) => {
			ctx.body = 'GET for one more handlers';
		}
	],
	'/:id': {
		get: (ctx) => {
			ctx.body = `get weibo: ${ctx.params.id}`;
		},
		post: async (ctx) => {
			ctx.body = `post weibo: ${ctx.params.id}`;
		}
	},
	'/temp': {
		delete: [
			async (ctx, next) => {
				ctx.myOwnVar = 'this is a middleware.';
				await next();
			},
			async (ctx) => {
				ctx.body = `${ctx.myOwnVar}ordinary api`;
			}
		]
	}
};
