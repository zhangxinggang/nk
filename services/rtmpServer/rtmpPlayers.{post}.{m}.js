var _ = require("lodash");
var moment = require("moment");
var core_ctx = require("./core_ctx.js");
module.exports = function (sender) {
  /**
        {
            "test.flv":{
                "subscribers":[{
                    "id":"OihcK58Kb",
                    "startTime":"2019-01-11T02:14:11.061Z",
                    "bytes":12059750,
                    "ip":"::ffff:127.0.0.1",
                    "protocol":"rtmp"
                }]
            }
        }
     */
  var players = {};
  core_ctx.sessions.forEach(function (session, id) {
    if (session.isStarting) {
      var regRes = /\/(.*)\/(.*)/gi.exec(
        session.publishStreamPath || session.playStreamPath
      );
      if (regRes === null) return;
      var playPath = session.connectCmdObj.tcUrl;
      var app = _.slice(regRes, 1);
      if (!_.get(players, [playPath])) {
        _.set(players, [playPath], {
          subscribers: [],
        });
      }
      switch (true) {
        case !!session.playStreamPath: {
          switch (session.constructor.name) {
            case "NodeRtmpSession": {
              players[playPath]["subscribers"].push({
                id: session.id,
                startTime: moment(session.startTime).format(
                  "YYYY-MM-DD HH:mm:ss"
                ),
                outBytes: session.socket.bytesWritten,
                ip: session.socket.remoteAddress,
                protocol: "rtmp",
              });
              break;
            }
            case "NodeFlvSession": {
              players[playPath]["subscribers"].push({
                id: session.id,
                startTime: moment(session.startTime).format(
                  "YYYY-MM-DD HH:mm:ss"
                ),
                bytes: session.req.connection.bytesWritten,
                ip: session.req.connection.remoteAddress,
                protocol: session.TAG === "websocket-flv" ? "ws" : "http",
              });
              break;
            }
          }
          break;
        }
      }
    }
  });
  var result = {
    total: 0,
    rows: [],
  };
  for (var key in players) {
    result["total"]++;
    for (var i = 0; i < players[key]["subscribers"].length; i++) {
      players[key]["subscribers"][i]["path"] = key;
    }
    result["rows"] = players[key]["subscribers"];
  }
  sender.success(result);
};
