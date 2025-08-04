const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');
class Request {
	constructor(options) {
		return new Promise((resolve, reject) => {
			let opts = {
				headers: {
					'Content-Type': 'application/json'
				},
				method: 'get',
				encoding: 'utf8',
				isBuffer: false,
				json: true
			};
			if (typeof options == 'string') {
				opts.url = options;
			} else {
				Object.assign(opts, options);
			}
			if (opts.data) {
				if (opts.method.toLowerCase() === 'get') {
					opts.url += '?' + querystring.stringify(opts.data);
				} else {
					opts.data = JSON.stringify(opts.data);
					opts.headers['Content-Length'] = Buffer.from(opts.data).length;
				}
			}
			let urlObj = url.parse(opts.url);
			urlObj['protocol'] = urlObj['protocol'] || 'http:';
			let htp = NKGlobal.config.services.httpServer.protocols[urlObj['protocol'].split(':')[0]];
			urlObj['hostname'] = urlObj['hostname'] || 'localhost';
			urlObj['port'] = urlObj['port'] || htp.port;
			let assignKeys = ['hostname', 'port', 'path', 'auth'];
			assignKeys.map((item) => {
				urlObj[item] && (opts[item] = urlObj[item]);
			});

			delete opts.url;
			let req = (urlObj['protocol'] == 'http:' ? http : https).request(opts, function (res) {
				let body = [];
				let size = 0;
				res.on('data', function (chunk) {
					body.push(chunk);
					size += chunk.length;
				});
				res.on('end', function () {
					let result = '';
					if (opts.isBuffer) {
						result = Buffer.concat(body, size);
					} else {
						let buffer = Buffer.alloc(size);
						for (let i = 0, pos = 0, l = body.length; i < l; i++) {
							let chunk = body[i];
							chunk.copy(buffer, pos);
							pos += chunk.length;
						}
						result = buffer.toString(opts.encoding);
						if (opts.json) {
							try {
								result = JSON.parse(result);
							} catch (e) {
								reject(new Error(result));
							}
						}
					}
					resolve(result);
				});
			});
			req.on('error', reject);
			if (opts.method.toLowerCase() !== 'get' && opts.data) {
				req.write(opts.data);
			}
			req.end();
		});
	}
}
module.exports = Request;
