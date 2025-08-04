module.exports = function (sender) {
	var escapeReg = require('escape-string-regexp');
	var moment = require('moment');
	var pathModule = require('path');
	var formLiveParam = require(
		pathModule.join(NKGlobal.config.httpServer.httpServerPath, 'servers/video/formLiveParam.js')
	);
	var body = sender.req.body;
	/**
     * @return {[type]}
     * 
        {
            "total":1,
            "rows":[{
                "id":"dtr1nHNAm",
                "path":"rtsp://127.0.0.1:554/test.sdp",
                "transType":"udp",
                "inBytes":6192000,
                "outBytes":359,
                "startTime":"2019-01-10 16:51:54",
                "onlines":0
            }]
        }
     * 
     */
	var context = require('./core_ctx.js');
	var rtspServer = context.server;
	var pushers = [];
	var start = parseInt(body.start) || 0;
	var limit = parseInt(body.limit) || 10;
	var q = body.q || '';
	var sort = body.sort;
	var order = body.order;
	for (var path in rtspServer.pushSessions) {
		var pusher = rtspServer.pushSessions[path];
		var streamUrl = 'rtsp://' + sender.req.hostname + ':' + rtspServer.rtspServer.port + pusher.path;
		//m3u8地址
		if (!pusher.m3u8Path) {
			var currentStream = {
				deviceName: pusher.id,
				streamUrl: streamUrl
			};
			Object.assign(currentStream, NKGlobal.config.video.camera);
			var m3u8Path = sender.req.protocol + '://' + sender.req.headers.host + formLiveParam.liveAddr(currentStream);
			currentStream.tempLive = true;
			var LiveStream = require(
				pathModule.join(NKGlobal.config.httpServer.httpServerPath, 'servers/video/liveStream.js')
			);
			var tempStream = new LiveStream(currentStream);
			tempStream.start();
			pusher.m3u8Path = m3u8Path;
		}
		pushers.push({
			id: pusher.id,
			path: streamUrl,
			m3u8Path: pusher.m3u8Path,
			transType: pusher.transType,
			inBytes: pusher.inBytes,
			outBytes: pusher.outBytes,
			startTime: moment(pusher.startTime).format('YYYY-MM-DD HH:mm:ss'),
			onlines: (rtspServer.playSessions[path] || []).length
		});
	}
	if (sort) {
		pushers.sort((a, b) => {
			return new String(a[sort]).localeCompare(new String(b[sort])) * (order == 'ascending' ? 1 : -1);
		});
	}
	if (q) {
		pushers = pushers.filter((v) => {
			var exp = new RegExp(escapeReg(q));
			return exp.test(v.path) || exp.test(v.id);
		});
	}
	sender.success({
		total: pushers.length,
		rows: pushers.slice(start, start + limit)
	});
};
