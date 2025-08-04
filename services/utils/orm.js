// https://typeorm.io
const typeorm = require('typeorm');
const glob = require('glob');
const fs = require('fs');
const merge = require('merge');
const { currencyOperation } = require('./staticStandard');
$fixVal(global, '$typeorm', typeorm);
const orm = NKGlobal.config.storage.orm;
const ormPool = {};
const filterRuleKey = {
	contains: 'Like',
	equal: 'Equal',
	notequal: 'Not',
	less: 'LessThan',
	lessorequal: 'LessThanOrEqual',
	greater: 'MoreThan',
	greaterorequal: 'MoreThanOrEqual',
	in: 'In',
	Between: 'Between',
	IsNull: 'IsNull',
	Any: 'Any'
};
function formatRelationsToObj(re) {
	!re && (re = []);
	var tempObj = {};
	for (var i = 0; i < re.length; i++) {
		if (Object.prototype.toString.call(re[i]) == '[object Object]') {
			for (var key in re[i]) {
				tempObj[key] = re[i][key];
			}
		} else {
			tempObj[re[i]] = re[i];
		}
	}
	return tempObj;
}
const ormConnKey = function (options = {}) {
	let dialect = options['dialect'];
	dialect = (dialect ? dialect : orm.engine).toLowerCase();
	let defaultDBConf = JSON.parse(JSON.stringify(orm[orm.engine]));
	Object.assign(defaultDBConf, options);
	const ormConf = {
		type: dialect,
		logging: defaultDBConf.hasOwnProperty('logging') ? defaultDBConf['logging'] : false,
		dateStrings: typeof options['dateStrings'] != 'undefined' ? options['dateStrings'] : true,
		synchronize: defaultDBConf.hasOwnProperty('synchronize') ? defaultDBConf['synchronize'] : false,
		username: defaultDBConf.username || defaultDBConf.user
	};
	Object.assign(ormConf, defaultDBConf);
	if (dialect == 'oracle' && !ormConf['connectString']) {
		console.error(new Error('connectString in config is need!'));
	} else {
		let ormConnStr = JSON.stringify(ormConf);
		return ormConnStr;
	}
};
const ormConn = function (options = {}, entitySchema) {
	const ormConnStr = ormConnKey(options);
	const ormConf = JSON.parse(ormConnStr);
	ormConf['entities'] = entitySchema;
	ormPool[ormConnStr]['authenticate'] = function () {
		return new Promise(function (resolve, reject) {
			typeorm
				.createConnection(ormConf)
				.then(function (res) {
					res.models = {};
					let entities = res.options.entities;
					entities.map(function (item) {
						res.models[item['options']['tableName']] = item;
					});
					ormPool[ormConnStr] = res;
					ormPool[ormConnStr]['ormName'] = 'typeorm';
					resolve(null);
				})
				.catch(function (err) {
					reject(err);
				});
		});
	};
};
function upperJSONKey(jsonObj) {
	for (var key in jsonObj) {
		var upperKey = key.toUpperCase();
		if (!jsonObj[upperKey]) {
			jsonObj['' + key.toUpperCase() + ''] = jsonObj[key];
			delete jsonObj[key];
		}
	}
	return jsonObj;
}
const conn = function (ormConf = {}, modelsPathArr) {
	const ormConnStr = ormConnKey(ormConf);
	!ormPool[ormConnStr] && (ormPool[ormConnStr] = {});
	if (!ormPool[ormConnStr]['isConnected']) {
		modelsPathArr = modelsPathArr || orm['entities'];
		const allESc = [];
		modelsPathArr.forEach(function (item, index) {
			var itemStat = fs.statSync(item);
			if (itemStat.isFile()) {
				allESc.push(item);
			} else {
				let files = glob.sync(item + '/**/*.js');
				files.map(function (one, i) {
					allESc.push(one);
				});
			}
		});
		const entitySchema = allESc.map(function (item) {
			let entity = require(item);
			if (entity['columns']) {
				entity['tableName'] = entity['tableName'] || entity['name'];
				if (JSON.parse(ormConnStr)['type'] == 'oracle') {
					entity['tableName'] = entity['tableName'].toUpperCase();
					upperJSONKey(entity['columns']);
				}
				return new typeorm.EntitySchema(entity);
			}
		});
		ormConn(ormConf, entitySchema);
	}
	return ormPool[ormConnStr];
};
const formatterQueryParam = function (sender, orm) {
	!orm && (orm = conn());
	var parseKeyVal = function (keyArr) {
		keyArr.map(function (key) {
			if (sender.req.body[key]) {
				typeof sender.req.body[key] == 'string' && (sender.req.body[key] = JSON.parse(sender.req.body[key]));
			}
			if (sender.req.query[key]) {
				typeof sender.req.query[key] == 'string' && (sender.req.query[key] = JSON.parse(sender.req.query[key]));
			}
		});
	};
	parseKeyVal(['where', 'filterRules']);
	var options = sender.req;
	var queryObj = {
		where: {}
	};
	var page, rows, sort, order, filterRules, where;
	var querys = options.query ? Object.keys(options.query) : [];
	var bodys = options.body ? Object.keys(options.body) : [];
	filterRules = querys.includes('filterRules')
		? options.query.filterRules
		: bodys.includes('filterRules')
			? options.body.filterRules
			: '';
	if (filterRules) {
		for (var i = 0; i < filterRules.length; i++) {
			if (filterRules[i]['op'] == 'contains') {
				filterRules[i]['value'] = '%' + filterRules[i]['value'] + '%';
			}
			queryObj['where'][filterRules[i]['field']] = typeorm[filterRuleKey[filterRules[i]['op']]](
				filterRules[i]['value']
			);
		}
	}
	where = querys.includes('where') ? options.query.where : bodys.includes('where') ? options.body.where : {};
	Object.assign(queryObj['where'], where);
	page = querys.includes('page') ? options.query.page : bodys.includes('page') ? options.body.page : null;
	rows = querys.includes('rows') ? options.query.rows : bodys.includes('rows') ? options.body.rows : null;
	sort = querys.includes('sort') ? options.query.sort : bodys.includes('sort') ? options.body.sort : '';
	order = querys.includes('order') ? options.query.order : bodys.includes('order') ? options.body.order : '';
	order = order.toUpperCase();
	if (sort) {
		queryObj['order'] = {};
		var orders = order.split(',');
		sort.split(',').map(function (item, index, arr) {
			queryObj['order'][item] = orders[index] ? orders[index] : 'ASC';
		});
	}
	if (page) {
		queryObj['skip'] = (page - 1) * rows;
		queryObj['take'] = rows;
	}
	return queryObj;
};
const otbExec = function (options, orm) {
	!orm && (orm = conn());
	var reqMethod = options.sender.req.method.toLowerCase();
	var query = options.sender.req.query;
	var body = options.sender.req.body;
	var reqObj = query;
	if (reqMethod == 'post') {
		reqObj = body;
	}
	query.action = query.action || body.action || 'query';
	var action = query.action.toLowerCase();
	if (currencyOperation.view.includes(action)) {
		let queryParams = formatterQueryParam(options.sender);
		!options['findOptions'] && (options['findOptions'] = {});
		options['optFields'] && (options['findOptions']['select'] = options['optFields']);
		let queryObj = options['findOptions'];
		merge.recursive(queryObj, queryParams);
		queryObj['relations'] && (queryObj['relations'] = Object.keys(formatRelationsToObj(queryObj['relations'])));
		var checkPaging = function (rows, total) {
			if (typeof queryObj['skip'] != 'undefined') {
				var obj = {
					total: total,
					rows: rows
				};
				return obj;
			} else {
				return rows;
			}
		};
		if (options['isTree']) {
			if (queryObj['select']) {
				if (typeof queryObj['select'] == 'object') {
					queryObj['select'] = queryObj['select']
						.map(function (item) {
							return 'o.' + item;
						})
						.join(',');
				}
			} else {
				queryObj['select'] = 'o.*';
			}
			if (options['idParentField']) {
				let selfToSelfQb = orm
					.getRepository(options['tableName'])
					.createQueryBuilder('o')
					.select(queryObj['select'])
					.addSelect('count(r.' + options['idField'] + ')', 'ChildrenCount');
				if (queryObj['addSelect']) {
					for (let key in queryObj['addSelect']) {
						selfToSelfQb = selfToSelfQb.addSelect(key, queryObj['addSelect'][key]);
					}
				}
				if (queryObj['leftJoin']) {
					for (let key in queryObj['leftJoin']) {
						selfToSelfQb = selfToSelfQb.leftJoin(
							key,
							queryObj['leftJoin'][key][0],
							queryObj['leftJoin'][key][1],
							queryObj['leftJoin'][key][2]
						);
					}
				}
				selfToSelfQb = selfToSelfQb
					.leftJoin(
						orm['models'][options['tableName']],
						'r',
						'o.' + options['idField'] + '=r.' + options['idParentField']
					)
					.groupBy('o.' + options['idField']);
				var isLoadChildren = reqObj.isLoadChildren
					? reqObj.isLoadChildren
					: body.isLoadChildren
						? body.isLoadChildren
						: false;
				if (isLoadChildren) {
					selfToSelfQb
						.where('o.' + options['idParentField'] + '=:idParentField', {
							idParentField: reqObj['id'] || reqObj[options['idField']]
						})
						.orderBy(queryObj.order ? queryObj.order : queryObj.orderBy)
						.getRawMany()
						.then(function (res) {
							options.success(checkPaging(res, res.length));
						});
				} else {
					var qb = orm.getRepository(options['tableName']).createQueryBuilder().select(options['idField']);
					var selectObj = function (selContent) {
						return typeorm
							.getConnection()
							.createQueryBuilder()
							.select(selContent)
							.from('(' + selfToSelfQb.getQuery() + ')', 'a')
							.where(queryObj['where'])
							.andWhere('a.' + options['idParentField'] + ' not in(' + qb.getQuery() + ')');
					};
					var ptotal = new Promise(function (resolve, reject) {
						selectObj('count(a.' + options['idField'] + ')')
							.getRawMany()
							.then(function (res) {
								for (var key in res[0]) {
									resolve(res[0][key]);
								}
							})
							.catch(function (err) {
								reject(err);
							});
					});
					var prows = new Promise(function (resolve, reject) {
						selectObj('a.*')
							.orderBy(queryObj.order ? queryObj.order : queryObj.orderBy)
							.skip(queryObj['skip'])
							.take(queryObj['take'])
							.getRawMany()
							.then(function (res) {
								resolve(res);
							})
							.catch(function (err) {
								reject(err);
							});
					});
					Promise.all([ptotal, prows])
						.then(function (res) {
							options.success(checkPaging(res[1], res[0]));
						})
						.catch(function (err) {
							options.error(err);
						});
				}
			} else {
				let selfToSelfQb = orm
					.getRepository(options['tableName'])
					.createQueryBuilder('o')
					.select(queryObj['select'])
					.addSelect('count(r.' + options['idField'] + ')', 'ChildrenCount')
					.leftJoin(
						orm['models'][options['tableName']],
						'r',
						'r.' + options['treeNodeField'] + ' like concat(o.' + options['treeNodeField'] + ',".%")'
					)
					.groupBy('o.' + options['idField']);
				var isLoadChildren = reqObj.isLoadChildren
					? reqObj.isLoadChildren
					: body.isLoadChildren
						? body.isLoadChildren
						: false;
				if (isLoadChildren) {
					selfToSelfQb
						.where('o.' + options['treeNodeField'] + ' like :treeNodeField', {
							treeNodeField: reqObj[options['treeNodeField']] + '.%'
						})
						.andWhere('o.' + options['treeNodeField'] + ' not like :ntreeNodeField', {
							ntreeNodeField: reqObj[options['treeNodeField']] + '.%.%'
						})
						.orderBy(queryObj.order ? queryObj.order : queryObj.orderBy)
						.getRawMany()
						.then(function (res) {
							options.success(checkPaging(res, res.length));
						});
				} else {
					// selfToSelfQb
					// .getCount()
					// .then(function(res){
					// 	console.log(res)
					// }).catch(function(err){
					// 	console.log(err)
					// })
					var selectObj = function (selContent) {
						return typeorm
							.getConnection()
							.createQueryBuilder()
							.select(selContent)
							.from('(' + selfToSelfQb.getQuery() + ')', 'a')
							.where(queryObj['where'])
							.andWhere('a.' + options['treeNodeField'] + " not like '%.%'");
					};
					var ptotal = new Promise(function (resolve, reject) {
						selectObj('count(a.' + options['idField'] + ')')
							.getRawMany()
							.then(function (res) {
								for (var key in res[0]) {
									resolve(res[0][key]);
								}
							})
							.catch(function (err) {
								reject(err);
							});
					});
					var prows = new Promise(function (resolve, reject) {
						selectObj('a.*')
							.orderBy(queryObj.order ? queryObj.order : queryObj.orderBy)
							.skip(queryObj['skip'])
							.take(queryObj['take'])
							.getRawMany()
							.then(function (res) {
								resolve(res);
							})
							.catch(function (err) {
								reject(err);
							});
					});
					Promise.all([ptotal, prows])
						.then(function (res) {
							options.success(checkPaging(res[1], res[0]));
						})
						.catch(function (err) {
							options.error(err);
						});
				}
			}
		} else {
			//getManyAndCount
			orm
				.getRepository(options['tableName'])
				.findAndCount(queryObj)
				.then(function (res) {
					options.success(checkPaging(res[0], res[1]));
				})
				.catch(function (err) {
					options.error(err);
				});
		}
	} else if (currencyOperation.add.includes(action)) {
		// typeorm.getManager()
		// .insert(orm['models'][options['tableName']],reqObj['delta'])
		// .then(function(res){
		// 	options.success(res.identifiers)
		// }).catch(function(err){
		// 	options.error(err)
		// })
		orm
			.getRepository(options['tableName'])
			.save(reqObj['delta'])
			.then(function (res) {
				options.success(res);
			})
			.catch(function (err) {
				options.error(err);
			});
	} else if (currencyOperation.edit.includes(action)) {
		let updates = reqObj['delta'];
		if (Object.prototype.toString.call(updates) == '[object Object]') {
			updates = [updates];
		}
		const tasks = [];
		for (let i = 0; i < updates.length; i++) {
			tasks.push(
				new Promise(function (resolve, reject) {
					typeorm
						.getManager()
						.update(orm['models'][options['tableName']], updates[i][options.idField], updates[i])
						.then(function (res) {
							resolve(res);
						})
						.catch(function (err) {
							reject(err);
						});
				})
			);
		}
		Promise.all(tasks)
			.then(function (res) {
				options.success(res);
			})
			.catch(function (err) {
				options.error(err);
			});
	} else if (currencyOperation.delete.includes(action)) {
		// typeorm.getManager()
		// .delete(orm['models'][options['tableName']],reqObj['delta'])
		// .then(function(res){
		// 	options.success(res)
		// }).catch(function(err){
		// 	options.error(err)
		// })
		orm
			.getRepository(options['tableName'])
			.delete(reqObj['delta'])
			.then(function (res) {
				options.success(res);
			})
			.catch(function (err) {
				options.error(err);
			});
	} else if (action == 'magicsave') {
		let delta = reqObj['delta'];
		const tasks = [];
		for (let i = 0; i < delta.length; i++) {
			let idField = delta[i][options.idField];
			tasks.push(
				new Promise(function (resolve, reject) {
					var tempPromise = new Promise(function (resolve) {
						resolve(delta[i]);
					});
					if (!idField) {
						tempPromise.then(function (res) {
							orm.getRepository(options['tableName']).save(res).then(resolve).catch(reject);
						});
					} else {
						tempPromise
							.then(function () {
								var findOptions = {
									where: {}
								};
								findOptions['where'][options.idField] = idField;
								var relations = [];
								var relationsObj = {};
								if (options['findOptions'] && options['findOptions']['relations']) {
									relationsObj = formatRelationsToObj(options['findOptions']['relations']);
									relations = Object.keys(relationsObj);
									findOptions['relations'] = relations;
								}
								var ormSave = orm
									.getRepository(options['tableName'])
									.findOne(findOptions)
									.then(function (data) {
										for (var key in delta[i]) {
											if (relations.indexOf(key) > -1) {
												var relaArr = delta[i][key];
												var newRelationItem = [];
												for (var j = 0; j < relaArr.length; j++) {
													var isExist = false;
													for (var k = 0; k < data[key].length; k++) {
														//编辑，当对已存在数据更改
														if (relaArr[j][relationsObj[key]] == data[key][k][relationsObj[key]]) {
															isExist = true;
															for (var key2 in relaArr[j]) {
																if (key2 != relationsObj[key]) {
																	data[key][k][key2] = relaArr[j][key2];
																}
															}
															break;
														}
													}
													if (!isExist) {
														newRelationItem.push(relaArr[j]);
													}
												}
												data[key] = data[key].concat(newRelationItem);
											} else if (key != options.idField) {
												data[key] = delta[i][key];
											}
										}
										orm.getRepository(options['tableName']).save(data).then(resolve).catch(reject);
									});
							})
							.catch(reject);
					}
				})
			);
		}
		Promise.all(tasks)
			.then(function (res) {
				options.success(delta);
			})
			.catch(function (err) {
				options.error(err);
			});
	} else {
		options.error(new Error('无法识别操作类型！'));
		return;
	}
};
const fresh = function (options, orm) {
	!orm && (orm = conn());
	orm
		.createQueryBuilder()
		.insert()
		.into(orm.models[options['tableName']])
		.values(options['data'])
		.orUpdate({
			conflict_target: options['conflict_target'],
			overwrite: options['updateOnDuplicate']
		})
		.execute()
		.then(function (result) {
			if (options.success) {
				options.success(result);
			}
		})
		.catch(function (err) {
			if (options.error) {
				options.error(err);
			}
		});
};
const magicsave = function (options, orm) {
	var functionObj = {};
	for (var key in options) {
		if (typeof (options[key] == 'function')) {
			functionObj[key] = options[key];
		}
	}
	var options = JSON.parse(JSON.stringify(options));
	var needKey = ['conflict_target', 'data', 'tableName', 'idField'];
	if (Object.prototype.toString.call(options.data) != '[object Object]') {
		if (options.error) {
			options.error(new Error('orm magicsave 方法中“data”必须为对象！'));
			return;
		}
	}
	for (var i = 0; i < needKey.length; i++) {
		if (!options[needKey[i]]) {
			if (options.error) {
				options.error(new Error('orm magicsave 方法中“' + needKey[i] + '”必须存在！'));
			}
			return;
		}
	}
	!orm && (orm = conn());
	var findObj = {};
	for (var i = 0; i < options['conflict_target'].length; i++) {
		findObj[options['conflict_target'][i]] = options['data'][options['conflict_target'][i]];
	}
	var ormSave = orm
		.getRepository(options['tableName'])
		.findOne(findObj)
		.then(function (data) {
			data && (options['data'][options.idField] = data[options.idField]);
			if (options['updateOnDuplicate']) {
				for (var key in options['data']) {
					if (
						key != options['idField'] &&
						options['updateOnDuplicate'].indexOf(key) < 0 &&
						options['conflict_target'].indexOf(key) < 0
					) {
						delete options['data'][key];
					}
				}
			}
			Object.assign(ormSave, options['data']);
			if (functionObj['beforeSave']) {
				functionObj['beforeSave'](ormSave);
			}
			if (ormSave[options.idField]) {
				orm
					.getRepository(options['tableName'])
					.save(ormSave)
					.then(function (res) {
						if (functionObj['success']) {
							functionObj['success'](ormSave);
						}
					})
					.catch(function (err) {
						if (functionObj['error']) {
							functionObj['error'](err);
						}
					});
			} else {
				orm
					.getRepository(options['tableName'])
					.save(options['data'])
					.then(function (res) {
						if (functionObj['success']) {
							functionObj['success'](ormSave);
						}
					})
					.catch(function (err) {
						if (functionObj['error']) {
							functionObj['error'](err);
						}
					});
			}
		})
		.catch(function (err) {
			if (functionObj['error']) {
				functionObj['error'](err);
			}
		});
};
module.exports = {
	conn,
	otbExec,
	formatterQueryParam,
	fresh,
	magicsave
};
