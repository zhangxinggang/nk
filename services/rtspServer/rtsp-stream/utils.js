/*jshint node:true*/
'use strict';
var spawn = require('child_process').spawn;
var isWindows = require('os')
	.platform()
	.match(/win(32|64)/);
var nlRegexp = /\r\n|\r|\n/g;
var streamRegexp = /^\[?(.*?)\]?$/;
var filterEscapeRegexp = /[,]/;
function parseProgressLine(line) {
	var progress = {};
	// Remove all spaces after = and trim
	line = line.replace(/=\s+/g, '=').trim();
	var progressParts = line.split(' ');
	// Split every progress part by "=" to get key and value
	for (var i = 0; i < progressParts.length; i++) {
		var progressSplit = progressParts[i].split('=', 2);
		var key = progressSplit[0];
		var value = progressSplit[1];
		// This is not a progress line
		if (typeof value === 'undefined') return null;
		progress[key] = value;
	}
	// var needWords=['frame','fps','bitrate','size','time'];
	// for(var i=0;i<needWords.length;i++){
	//     if(!progress[needWords[i]]){
	//         progress[needWords[i]]=0;
	//     }
	// }
	return progress;
}
var utils = (module.exports = {
	isWindows: isWindows,
	streamRegexp: streamRegexp,
	avToMp4Ffmpeg: function (file, type, endCB) {
		var targetFile = file.substring(0, file.lastIndexOf('.')) + '.' + type;
		this.spawnFfmpeg(
			['-i', file, '-b:v', '500k', '-vcodec', 'copy', '-ab', '32k', '-ar', '24000', '-acodec', 'copy', targetFile],
			{},
			function () {},
			endCB
		);
	},
	/**
	 * Copy an object keys into another one
	 *
	 * @param {Object} source source object
	 * @param {Object} dest destination object
	 * @private
	 */
	spawnFfmpeg: function (args, options, processCB, endCB) {
		//参数确保
		if (typeof options === 'function') {
			endCB = processCB;
			processCB = options;
			options = {};
		} else if (typeof processCB === 'undefined') {
			processCB = function (param, data) {};
			endCB = function (err, result) {};
		} else if (typeof endCB === 'undefined') {
			endCB = function (err, result) {};
		}
		var ffmpegProc = spawn('ffmpeg', args, options);
		if (ffmpegProc.stderr) {
			ffmpegProc.stderr.setEncoding('utf8');
		}
		ffmpegProc.on('error', function (err) {
			endCB(err);
		});
		var exitError = null;
		function handleExit(err) {
			if (err) {
				exitError = err;
			}
			if (!processExited) {
				endCB(exitError);
			}
		}
		// Handle process exit
		var processExited = true;
		ffmpegProc.on('exit', function (code, signal) {
			processExited = false;
			if (signal) {
				handleExit(new Error('ffmpeg was killed with signal ' + signal));
			} else if (code) {
				handleExit(new Error('ffmpeg exited with code ' + code));
			} else {
				handleExit();
			}
		});
		ffmpegProc.stderr.on('data', function (data) {
			var progress = parseProgressLine(data);
			if (progress) {
				processCB(
					{
						stream: ffmpegProc,
						frames: parseInt(progress.frame, 10),
						currentFps: parseInt(progress.fps, 10),
						currentKbps: progress.bitrate ? parseFloat(progress.bitrate.replace('kbits/s', '')) : 0,
						targetSize: parseInt(progress.size || progress.Lsize, 10),
						timemark: progress.time
					},
					data
				);
			}
		});
		ffmpegProc.stderr.on('close', function () {
			handleExit();
		});
	},
	/**
	 * Creates a line ring buffer object with the following methods:
	 * - append(str) : appends a string or buffer
	 * - get() : returns the whole string
	 * - close() : prevents further append() calls and does a last call to callbacks
	 * - callback(cb) : calls cb for each line (incl. those already in the ring)
	 * @param {Numebr} maxLines maximum number of lines to store (<= 0 for unlimited)
	 */
	linesRing: function (maxLines) {
		var cbs = [];
		var lines = [];
		var current = null;
		var closed = false;
		var max = maxLines - 1;
		function emit(line) {
			cbs.forEach(function (cb) {
				cb(line);
			});
		}
		return {
			callback: function (cb) {
				lines.forEach(function (l) {
					cb(l);
				});
				cbs.push(cb);
			},
			append: function (str) {
				if (closed) return;
				if (str instanceof Buffer) str = '' + str;
				if (!str || str.length === 0) return;
				var newLines = str.split(nlRegexp);
				if (newLines.length === 1) {
					if (current !== null) {
						current = current + newLines.shift();
					} else {
						current = newLines.shift();
					}
				} else {
					if (current !== null) {
						current = current + newLines.shift();
						emit(current);
						lines.push(current);
					}
					current = newLines.pop();
					newLines.forEach(function (l) {
						emit(l);
						lines.push(l);
					});
					if (max > -1 && lines.length > max) {
						lines.splice(0, lines.length - max);
					}
				}
			},
			get: function () {
				if (current !== null) {
					return lines.concat([current]).join('\n');
				} else {
					return lines.join('\n');
				}
			},
			close: function () {
				if (closed) return;
				if (current !== null) {
					emit(current);
					lines.push(current);
					if (max > -1 && lines.length > max) {
						lines.shift();
					}
					current = null;
				}
				closed = true;
			}
		};
	}
});
