const dotenv = require('dotenv');
const glob = require('glob');
const path = require('path');
const merge = require('merge');
const fs = require('fs');
//初始化环境变量，先执行
dotenv.config();
const logger = require('./utils/logger');
const request = require('./utils/request');
const config = require('../config') || {};

//变量不可修改
let fixVal = (originObj, newObjName, value) => {
	Object.defineProperty(originObj, newObjName, {
		value: value,
		writable: false,
		enumerable: true,
		configurable: false
	});
};

//异常处理
let errorHanlder = () => {
	process.on('uncaughtException', (e) => {
		console.error('uncaughtException:', e);
	});
	process.on('unhandledRejection', (e) => {
		console.error('unhandledRejection:', e);
	});
	process.on('rejectionHandled', (e) => {
		console.error('rejectionHandled:', e);
	});
};
//初始化
let init = (config) => {
	!process.env.NODE_ENV && (process.env.NODE_ENV = 'production');
	//将配置文件写进内存
	global.NKGlobal = { config };
	if (config.requireAlias) {
		global.NKRequire = function (namespace, file) {
			var dir = config.requireAlias[namespace];
			if (fs.existsSync(dir)) {
				return require(path.join(dir, file));
			} else {
				console.error(new Error('at config->requireAlias not found ' + namespace + '!'));
			}
		};
	}
	fixVal(global, '$fixVal', fixVal);
	//网络请求
	$fixVal(global, '$request', request);
	//记录日志
	new logger(config).init();
	//设置程序名称
	process.title = (config.project && config.project.name) || 'nk';
	errorHanlder();
};
let endingWorks = () => {
	let allPrerequisites = [];
	let jsDirs = path.join(__dirname, './server/prerequisite/**/*.js');
	let prerequisitePreLoads = glob.sync(jsDirs, { cwd: __dirname });
	prerequisitePreLoads.forEach((c) => allPrerequisites.push(require(c)()));
	Promise.all(allPrerequisites)
		.then((value) => {
			let prerequisiteSuc = value.every((item) => {
				return item;
			});
			if (prerequisiteSuc) {
				let autoRunTask = NKGlobal.config.autoRunTask;
				if (autoRunTask.start == true && autoRunTask.rootDirs) {
					console.info('[autoRun] task is open');
					autoRunTask.rootDirs.map((item) => {
						let autoRunTaskPreLoads = glob.sync(path.join(item, '/**/*.js'), {
							cwd: __dirname
						});
						autoRunTaskPreLoads.forEach((c) => require(c));
					});
				}
			}
		})
		.catch((err) => {
			console.error(err);
		});
};
module.exports = function (pcf) {
	pcf = pcf || {};
	merge.recursive(config, pcf);
	init(config);
	let allService = [];
	let services = config.services;
	Object.keys(services).map((item) => {
		let serverConf = config['services'][item];
		if (serverConf.start) {
			try {
				var server = require('./' + item);
				allService.push(
					new Promise((resolve, reject) => {
						try {
							new server(serverConf).start(() => {
								resolve(item);
							});
						} catch (e) {
							reject(e);
						}
					})
				);
			} catch (e) {
				console.error(e);
			}
		}
	});
	Promise.all(allService).then(function (done) {
		endingWorks(done);
	});
};
