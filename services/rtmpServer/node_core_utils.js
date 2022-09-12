var Crypto = require("crypto");
var EventEmitter = require("events");
var { spawn } = require("child_process");
var readline = require("readline");
function verifyAuth(signStr, streamId, secretKey) {
  if (signStr === undefined) {
    return false;
  }
  let now = (Date.now() / 1000) | 0;
  let exp = parseInt(signStr.split("-")[0]);
  let shv = signStr.split("-")[1];
  let str = streamId + "-" + exp + "-" + secretKey;
  if (exp < now) {
    return false;
  }
  let md5 = Crypto.createHash("md5");
  let ohv = md5.update(str).digest("hex");
  return shv === ohv;
}
function getFFmpegVersion(ffpath) {
  return new Promise((resolve, reject) => {
    let ffmpeg_exec = spawn(ffpath, ["-version"]);
    let version = "";
    ffmpeg_exec.on("error", (e) => {
      reject(e);
    });
    ffmpeg_exec.stdout.on("data", (data) => {
      try {
        version = data
          .toString()
          .split(/(?:\r\n|\r|\n)/g)[0]
          .split(" ")[2];
      } catch (e) {}
    });
    ffmpeg_exec.on("close", (code) => {
      resolve(version);
    });
  });
}
function getFFmpegUrl() {
  let url = "";
  switch (process.platform) {
    case "darwin":
      url =
        "https://ffmpeg.zeranoe.com/builds/macos64/static/ffmpeg-latest-macos64-static.zip";
      break;
    case "win32":
      url =
        "https://ffmpeg.zeranoe.com/builds/win64/static/ffmpeg-latest-win64-static.zip | https://ffmpeg.zeranoe.com/builds/win32/static/ffmpeg-latest-win32-static.zip";
      break;
    case "linux":
      url =
        "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-64bit-static.tar.xz | https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-32bit-static.tar.xz";
      break;
    default:
      url = "http://ffmpeg.org/download.html";
      break;
  }
  return url;
}
module.exports = {
  verifyAuth,
  getFFmpegVersion,
  getFFmpegUrl,
};
