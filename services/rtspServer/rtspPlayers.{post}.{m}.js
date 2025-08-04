module.exports = function (sender) {
	var escapeReg = require('escape-string-regexp');
	var moment = require('moment');
	var body = sender.req.body;
	/**
     * @return {[type]}               [description]
    {
        "total":1,
        "rows":[{
            "id":"vzsAuQp2L",
            "path":"rtsp://127.0.0.1:554/test.sdp",
            "transType":"tcp",
            "inBytes":609,
            "outBytes":18310747,
            "startTime":"2019-01-11 08:32:32"
        }]
    }
     */
	var context = require('./core_ctx.js');
	var rtspServer = context.server;
	var players = [];
	var start = parseInt(body.start) || 0;
	var limit = parseInt(body.limit) || 10;
	var q = body.q || '';
	var sort = body.sort;
	var order = body.order;
	for (var path in rtspServer.playSessions) {
		var _players = rtspServer.playSessions[path] || [];
		var streamUrl = 'rtsp://' + sender.req.hostname + ':' + rtspServer.rtspServer.port + path;
		_players = _players.map((player) => {
			return {
				id: player.id,
				path: streamUrl,
				transType: player.transType,
				inBytes: player.inBytes,
				outBytes: player.outBytes,
				protocol: 'rtsp',
				startTime: moment(player.startTime).format('YYYY-MM-DD HH:mm:ss')
			};
		});
		players = players.concat(_players);
	}
	if (sort) {
		players.sort((a, b) => {
			return new String(a[sort]).localeCompare(new String(b[sort])) * (order == 'ascending' ? 1 : -1);
		});
	}
	if (q) {
		players = players.filter((v) => {
			var exp = new RegExp(escapeReg(q));
			return exp.test(v.path) || exp.test(v.id);
		});
	}
	sender.success({
		total: players.length,
		rows: players.slice(start, start + limit)
	});
};
