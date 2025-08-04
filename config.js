const path = require('path');
module.exports = {
	services: {
		rtmpServer: {
			start: false,
			port: 1935,
			chunk_size: 60000,
			gop_cache: true,
			ping: 60,
			ping_timeout: 30
		},
		rtspServer: {
			start: false,
			port: 554
		},
		tcpServer: {
			start: false,
			port: 8087
		},
		udpServer: {
			start: false,
			port: 41234
		},
		httpServer: {
			start: true,
			protocols: {
				http: {
					start: true,
					port: 8081
				},
				https: {
					start: true,
					port: 8080
					//key cert 默认读取path，如果没有path，会获取value字符串，如果都不设置，那么会是使用系统默认值开启https
					// key:{
					// 	path:path.join(__dirname,'../cert/2_www.saybeauty.cn.key'),
					// },
					// cert:{
					// 	path:path.join(__dirname,'../cert/1_www.saybeauty.cn_bundle.crt'),
					// 	value:''
					// }
				}
			},
			security: {
				secret: 'zxgNK',
				tokenExpiresIn: '8h',
				noAuthorityRoutes: ['/dynamic/*', '/mount/**', '/public/**']
			},
			bodyparser: {
				multipart: true,
				formidable: {
					maxFileSize: 1000 * 1024 * 1024,
					uploadDir: path.join(__dirname, './uploads'),
					keepExtensions: true
				}
			},
			routes: {
				dynamicRouteDirs: [
					{
						rootDir: path.join(__dirname, './demo/dynamicRouter'),
						rootPath: 'dynamic'
					}
				],
				mountRouteDirs: [
					{
						rootDir: path.join(__dirname, './demo/mountRouter'),
						rootPath: 'mount'
					}
				],
				staticDirs: [
					{
						rootDir: path.join(__dirname, './demo/static/public'),
						rootPath: 'public',
						auth: false
					},
					{
						rootDir: path.join(__dirname, './demo/static/private'),
						rootPath: 'private'
					}
				],
				proxyRoutes: {
					'/NKWeather': {
						target: 'http://wthrcdn.etouch.cn/weather_mini',
						//本地请求：http://127.0.0.1+port+/NKWeather?citykey=101010100等于访问http://wthrcdn.etouch.cn/weather_mini?citykey=101010100
						pathRewrite: {
							'^/NKWeather': ''
						},
						changeOrigin: true, // target是域名的话，需要这个参数，
						secure: false, // 设置支持https协议的代理
						auth: false
					}
				}
			}
		}
	},
	requireAlias: {
		NK: path.join(__dirname, './services/utils'),
		NKH: path.join(__dirname, './services/httpServer/src')
	},
	autoRunTask: {
		start: true,
		rootDirs: [path.join(__dirname, './demo/autoRunTask')]
	},
	storage: {
		orm: {
			start: false,
			engine: 'mysql',
			entities: [path.join(__dirname, '/database/entities')],
			mysql: {
				insecureAuth: true,
				host: process.env.db_host || '127.0.0.1',
				user: process.env.db_user || 'root',
				password: process.env.db_password || '123456',
				database: process.env.db_database || 'root',
				port: process.env.db_port || '3306',
				// logging:true,
				synchronize: true,
				multipleStatements: true,
				maxOperationRow: 50, //最大操作行数，防止查询过程语句太大，大于max-allowed-packet
				pool: {
					maxConnections: 30,
					minConnections: 10,
					maxIdleTime: 1000 * 30
				}
			}
		}
	},
	logger: {
		start: true,
		rootDir: path.join(process.cwd(), '/logs')
	},
	communication: {
		//邮件发送【系统错误信息、邮件服务】
		mailer: {
			start: true,
			defaultRecipients: ['540752013@qq.com'],
			server: 'wangyi163',
			tengxun: {
				host: 'smtp.qq.com',
				secureConnection: true,
				port: 465,
				auth: {
					user: process.env.mailer_user,
					pass: process.env.mailer_pass
				}
			},
			wangyi163: {
				host: 'smtp.163.com',
				secureConnection: true,
				port: 465,
				auth: {
					user: process.env.mailer_user,
					pass: process.env.mailer_pass
				}
			},
			wangyi126: {
				host: 'smtp.126.com',
				secureConnection: true,
				port: 465,
				auth: {
					user: process.env.mailer_user,
					pass: process.env.mailer_pass
				}
			}
		}
	},
	project: {
		name: 'nk',
		favIcon: path.join(__dirname, './services/server/view/favIcon.ico')
	}
};
