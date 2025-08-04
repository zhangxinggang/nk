var net = require('net');
var RTMPSession = require('./node_rtmp_session');
var NodeCoreUtils = require('./node_core_utils');
var context = require('./core_ctx');
var events = require('events');
class RtmpServer extends events.EventEmitter {
	constructor(rtmpServer) {
		super();
		this.rtmpServer = rtmpServer;
		this.pushSessions = {};
		this.playSessions = {};
		this.server = net.createServer();
		this.server
			.on('connection', (socket) => {
				new RTMPSession(socket, this);
			})
			.on('error', (err) => {
				console.error('rtmp server error:', err);
			})
			.on('listening', async () => {
				console.info(`[rtmpServer] started at port：${rtmpServer.port || 1935}`);
			});
	}
	start(callback) {
		if (this.rtmpServer && this.rtmpServer.start) {
			this.server.listen(this.rtmpServer.port || 1935, () => {
				callback && callback();
			});
			this.stats();
		} else {
			callback && callback();
		}
	}
	stats() {
		var context = require('./core_ctx.js');
		context.server = this;
	}
	stop() {
		this.server.close();
		context.sessions.forEach((session, id) => {
			if (session instanceof RTMPSession) {
				session.socket.destroy();
				context.sessions.delete(id);
			}
		});
	}
}
module.exports = RtmpServer;
