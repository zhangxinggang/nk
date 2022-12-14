// Generated by CoffeeScript 1.8.0
(function () {
  var Mpeg1Muxer, child_process, events, util;
  child_process = require("child_process");
  util = require("util");
  fs = require("fs");
  path = require("path");
  events = require("events");
  fsExtra = require("fs-extra");
  utils = require("./utils");
  moment = require("moment");
  lowdb = require("lowdb");
  FileSync = require("lowdb/adapters/FileSync");
  videoType = "avi";
  Mpeg1Muxer = function (options) {
    var self = this;
    self.options = options;
    self.pushStream = {};
    //保存一下原始路径
    self.options.streamFile.originalPath = path.join(
      self.options.streamFile.savePath
    );
    self.streamFun();
    self.pushStreamFun();
    self.liveStreamFun();
    return self;
  };
  util.inherits(Mpeg1Muxer, events.EventEmitter);
  //获取数据流
  Mpeg1Muxer.prototype.streamFun = function () {
    var self = this;
    var options = self.options;
    //获取数据流
    if (self.options.streamFile && self.options.streamFile.saveLocal) {
      // self.stream = child_process.spawn("ffmpeg", ["-rtsp_transport", "tcp", "-i", options.streamUrl, '-f', 'mpeg1video', '-b:v', '800k', '-r', '30', '-'], {
      //     detached: false
      // });
      self.resetSaveStream();
      //断电会影响掉了的问题
      var splitVideo = options.splitVideo;
      var splitType = splitVideo["type"];
      if (splitType.toLowerCase() == "size") {
        var splitCommand = "-fs";
      } else {
        var splitCommand = "-t";
      }
      utils.spawnFfmpeg(
        [
          "-y",
          "-i",
          options.streamUrl,
          "-f",
          videoType,
          splitCommand,
          splitVideo["category"][splitType],
          "-vcodec",
          "copy",
          "-acodec",
          "copy",
          path.join(
            self.options.streamFile.savePath,
            self.options.optFileStartTime + "." + videoType
          ),
        ],
        { detached: true },
        function (param, data) {
          return self.emit("mpeg1data", data);
        },
        function (err) {
          if (err) {
            console.log(err);
          }
          var startTimePath = path.join(
            self.options.streamFile.savePath,
            self.options.optFileStartTime + "." + videoType
          );
          var lastFileName =
            self.options.optFileStartTime +
            "_" +
            moment(new Date()).format("HH-mm-ss") +
            "." +
            videoType;
          var endTimePath = path.join(
            self.options.streamFile.savePath,
            lastFileName
          );
          if (fs.existsSync(startTimePath)) {
            fs.rename(startTimePath, endTimePath, function (err, result) {
              if (err) {
                console.log(err);
              } else {
                utils.avToMp4Ffmpeg(endTimePath, "mp4", function (err) {
                  if (err) {
                    console.log(err);
                  } else {
                    //保存数据到文件夹里面的json
                    var tempArr = path.join(endTimePath).split(path.sep);
                    var currentName = tempArr.slice(-1)[0];
                    var localDir = tempArr.slice(-2, -1)[0];
                    tempArr.pop();
                    var adapters = new FileSync(
                      path.join(tempArr.join("/"), "video.db.json")
                    );
                    var videoDB = lowdb(adapters);
                    if (!videoDB.get("date").value()) {
                      videoDB
                        .defaults({
                          date: localDir,
                          data: [],
                        })
                        .write();
                    }
                    var times = currentName.substring(
                      0,
                      currentName.lastIndexOf(".")
                    );
                    var name = times + ".mp4";
                    videoDB
                      .get("data")
                      .push({
                        time: times,
                        name: name,
                        url: path
                          .join(
                            self.options.liveSourceHead,
                            self.options.deviceName +
                              "/" +
                              localDir +
                              "/" +
                              name
                          )
                          .replace(new RegExp(/\\/, "g"), "/"),
                      })
                      .write();
                    fs.unlink(endTimePath, function (err) {
                      if (err) {
                        throw err;
                      }
                    });
                  }
                });
              }
            });
          }
          self.options.streamFile.savePath =
            self.options.streamFile.originalPath;
          self.streamFun();
        }
      );
      self.inputStreamStarted = true;
    }
  };
  Mpeg1Muxer.prototype.resetSaveStream = function () {
    if (this.options.streamFile && this.options.streamFile.saveLocal) {
      this.resetStreamFileSavePath();
      fsExtra.ensureDirSync(this.options.streamFile.savePath);
      //合并视频
      //ffmpeg -i 1.mp4 -qscale 4 1.mpg ffmpeg -i 2.mp4 -qscale 4 2.mpg
      //ffmpeg -f concat -i text.txt -c copy output.mp4
      this.options.optFileStartTime = moment(new Date()).format("HH-mm-ss");
    }
  };
  //推流
  Mpeg1Muxer.prototype.pushStreamFun = function () {
    var self = this;
    var options = self.options;
    if (options.pushStream && options.pushStream.open) {
      //这个地方需要研究，如果一个掉线，重启进程会不会多余其他
      for (var i = 0; i < options.pushStream.streamPath.length; i++) {
        if (!self.pushStream[options.pushStream.streamPath[i]]) {
          var tempPushStream = child_process.spawn(
            "ffmpeg",
            [
              "-i",
              options.streamUrl,
              "-codec",
              "copy",
              "-f",
              "rtsp",
              options.pushStream.streamPath[i],
            ],
            {
              detached: false,
            }
          );
          self.pushStream[options.pushStream.streamPath[i]] =
            tempPushStream.pid;
          tempPushStream.stderr.on("data", function (data) {
            return self.emit("ffmpegError", data);
          });
          tempPushStream.on("exit", function (code) {
            for (var key in self["pushStream"]) {
              if (this.pid == self["pushStream"][key]) {
                delete self["pushStream"][key];
                self.pushStreamFun();
                break;
              }
            }
          });
        }
      }
    }
  };
  //直播
  Mpeg1Muxer.prototype.liveStreamFun = function () {
    var self = this;
    var options = self.options;
    if (options.streamFile && options.streamFile.live) {
      self.resetStreamFileSavePath();
      var defPath = path.join(options.streamFile.savePath, "live");
      fsExtra.ensureDirSync(defPath);
      defPath = path.join(defPath, options.streamFile.streamFileName + ".m3u8");
      var cmd = [
        "-i",
        options.streamUrl,
        "-fflags",
        "flush_packets",
        "-max_delay",
        "1",
        "-an",
        "-flags",
        "-global_header",
        "-hls_time",
        "1",
        "-hls_list_size",
        "3",
        "-hls_wrap",
        "3",
        "-vcodec",
        "copy",
        "-y",
        defPath,
      ];
      utils.spawnFfmpeg(
        cmd,
        { detached: true },
        function (param, data) {
          // return self.emit('mpeg1data',data);
        },
        function (err) {
          if (err) {
            console.log(err);
          }
          options.streamFile.savePath = options.streamFile.originalPath;
          self.liveStreamFun();
        }
      );
      options.liveUrl = path.join(
        options.liveSourceHead,
        defPath.split(options.streamFile.originalPath)[1]
      );
    }
  };
  Mpeg1Muxer.prototype.dateFormatter = function (fmt, date) {
    fmt = fmt.toLowerCase(fmt);
    var o = {
      "m+": date.getMonth() + 1, //月份
      "d+": date.getDate(), //日
      "h+": date.getHours(), //小时
      mm: date.getMinutes(), //分
      "s+": date.getSeconds(), //秒
      "q+": Math.floor((date.getMonth() + 3) / 3), //季度
      ms: date.getMilliseconds(), //毫秒
    };
    if (/(y+)/.test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        (date.getFullYear() + "").substr(4 - RegExp.$1.length)
      );
    }
    for (var k in o) {
      if (new RegExp("(" + k + ")").test(fmt)) {
        fmt = fmt.replace(
          RegExp.$1,
          RegExp.$1.length == 1
            ? o[k]
            : ("00" + o[k]).substr(("" + o[k]).length)
        );
      }
    }
    return fmt;
  };
  Mpeg1Muxer.prototype.resetStreamFileSavePath = function () {
    var folderClassifiyAsTime = this.options.folderClassifiyAsTime;
    if (folderClassifiyAsTime[0]) {
      var time = this.dateFormatter("yyyy-mm-dd", new Date());
      var supportType = ["y", "m", "d"];
      var supportTypeNum = [4, 7, 10];
      var strTime = time.substring(
        0,
        supportTypeNum[supportType.indexOf(folderClassifiyAsTime[1])]
      );
      this.options.streamFile.savePath = path.join(
        this.options.streamFile.originalPath,
        this.options.deviceName,
        strTime
      );
    } else {
      this.options.streamFile.savePath = path.join(
        this.options.streamFile.originalPath,
        this.options.deviceName
      );
    }
  };
  module.exports = Mpeg1Muxer;
}.call(this));
