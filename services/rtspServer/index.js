var net = require("net");
var RTSPSession = require("./rtsp-session");
var events = require("events");
class RtspServer extends events.EventEmitter {
  constructor(rtspServer) {
    super();
    this.rtspServer = rtspServer;
    this.pushSessions = {};
    this.playSessions = {};
    this.server = net.createServer();
    this.server
      .on("connection", (socket) => {
        new RTSPSession(socket, this);
      })
      .on("error", (err) => {
        console.error("rtsp server error:", err);
      })
      .on("listening", async () => {
        console.info(
          "[rtspServer] started at port：" + (rtspServer.port || 554)
        );
      });
  }
  start(callback) {
    if (this.rtspServer && this.rtspServer.start) {
      this.server.listen(this.rtspServer.port || 554, () => {
        callback && callback();
      });
      this.stats();
    } else {
      callback && callback();
    }
  }
  stats() {
    var context = require("./core_ctx.js");
    context.server = this;
  }
  addSession(session) {
    if (session.type == "pusher") {
      this.pushSessions[session.path] = session;
    } else if (session.type == "player") {
      var playSessions = this.playSessions[session.path];
      if (!playSessions) {
        playSessions = [];
        this.playSessions[session.path] = playSessions;
      }
      if (playSessions.indexOf(session) < 0) {
        playSessions.push(session);
      }
    }
  }
  removeSession(session) {
    if (session.type == "pusher") {
      delete this.pushSessions[session.path];
    } else if (session.type == "player") {
      var playSessions = this.playSessions[session.path];
      if (playSessions && playSessions.length > 0) {
        var idx = playSessions.indexOf(session);
        if (idx >= 0) {
          playSessions.splice(idx, 1);
        }
      }
    }
  }
}

module.exports = RtspServer;
