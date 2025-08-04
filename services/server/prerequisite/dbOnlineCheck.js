const dbOnlineCheck = function () {
	return new Promise((resolve, reject) => {
		if (NKGlobal['config']['storage'] && NKGlobal['config']['storage']['orm']['start'] != false) {
			const orm = require('../../utils/orm').conn();
			orm
				.authenticate()
				.then(function () {
					let engine = NKGlobal['config']['storage']['orm']['engine'];
					console.info(`[${engine}] database is running normally`);
					resolve(true);
				})
				.catch(function (err) {
					console.log(err);
					setTimeout(function () {
						dbOnlineCheck();
					}, 1000 * 5);
				});
		} else {
			resolve(true);
		}
	});
};
module.exports = dbOnlineCheck;
