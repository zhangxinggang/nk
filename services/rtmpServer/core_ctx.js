var EventEmitter = require("events");
var sessions = new Map();
var publishers = new Map();
var idlePlayers = new Set();
var nodeEvent = new EventEmitter();
var stat = {
  inbytes: 0,
  outbytes: 0,
  accepted: 0,
};
var server = {};
module.exports = { sessions, publishers, idlePlayers, nodeEvent, stat, server };
