var _ = require('lodash');
var moment = require('moment');
var core_ctx = require('./core_ctx.js');
var pathModule = require('path');
module.exports = function (sender) {
	/**
     * [getStreams description]
     * @return {[object]}
     * {
           "test.flv":{
                "publisher":{
                    "id":"dtr1nHNAm",
                    "startTime":"2019-01-10T08:20:00.899Z",
                    "bytes":42792207,
                    "ip":"::ffff:127.0.0.1",
                    "audio":null,
                    "video":{
                        "codec":"Sorenson-H263",
                        "width":1280,
                        "height":720,
                        "profile":"",
                        "level":0,
                        "fps":10
                    }
                }
            }
       }
     */
	var formLiveParam = require(
		pathModule.join(NKGlobal.config.httpServer.httpServerPath, 'servers/video/formLiveParam.js')
	);
	var pushers = {};
	core_ctx.sessions.forEach(function (session, id) {
		if (session.isStarting) {
			var regRes = /\/(.*)\/(.*)/gi.exec(session.publishStreamPath || session.playStreamPath);
			if (regRes === null) return;
			var reg = new RegExp(session.appname, 'g');
			var name = session.publishStreamPath.replace(reg, '').replace(/\//g, '');
			var playPath = session.connectCmdObj.tcUrl + '/' + name;
			var [app] = _.slice(regRes, 1);
			if (!_.get(pushers, [playPath])) {
				_.set(pushers, [playPath], {
					publisher: null
				});
			}
			//m3u8地址
			if (!session.m3u8Path && session.isPublishing) {
				var currentStream = {
					deviceName: session.id,
					streamUrl: playPath
				};
				Object.assign(currentStream, NKGlobal.config.video.camera);
				var m3u8Path = sender.req.protocol + '://' + sender.req.headers.host + formLiveParam.liveAddr(currentStream);
				currentStream.tempLive = true;
				var LiveStream = require(
					pathModule.join(NKGlobal.config.httpServer.httpServerPath, 'servers/video/liveStream.js')
				);
				var tempStream = new LiveStream(currentStream);
				tempStream.start();
				session.m3u8Path = m3u8Path;
			}
			switch (true) {
				case session.isPublishing: {
					_.set(pushers, [playPath, 'publisher'], {
						id: session.id,
						startTime: moment(session.startTime).format('YYYY-MM-DD HH:mm:ss'),
						inBytes: session.socket.bytesRead,
						outBytes: session.socket.bytesWritten,
						m3u8Path: session.m3u8Path,
						onlines: 0,
						transType: 'tcp',
						ip: session.socket.remoteAddress,
						audio:
							session.audioCodec > 0
								? {
										codec: session.audioCodecName,
										profile: session.audioProfileName,
										samplerate: session.audioSamplerate,
										channels: session.audioChannels
									}
								: null,
						video:
							session.videoCodec > 0
								? {
										codec: session.videoCodecName,
										width: session.videoWidth,
										height: session.videoHeight,
										profile: session.videoProfileName,
										level: session.videoLevel,
										fps: session.videoFps
									}
								: null
					});
					break;
				}
				case !!session.playStreamPath: {
					if (session.constructor.name && pushers[playPath]['publisher']) {
						pushers[playPath]['publisher']['onlines']++;
					}
				}
			}
		}
	});
	var result = {
		total: 0,
		rows: []
	};
	for (var key in pushers) {
		if (pushers[key]['publisher']) {
			pushers[key]['publisher']['path'] = key;
			result['total']++;
			result['rows'].push(pushers[key]['publisher']);
		}
	}
	sender.success(result);
};
