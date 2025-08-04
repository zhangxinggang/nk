var tcpConnCount = 0;
class TcpServer {
	constructor(tcpServer) {
		this.tcpServer = tcpServer;
	}
	start(callback) {
		if (this.tcpServer && this.tcpServer.start) {
			var net = require('net');
			this.server = net.createServer();
			this.server.on('connection', function (socket) {
				console.log('tcpConnection++');
				tcpConnCount++;
				socket.on('data', function (content) {
					socket.write(content);
				});
				socket.on('error', function () {
					console.log('tcpConnection--');
					tcpConnCount--;
				});
			});
			var tcp_port = this.tcpServer.port || 8087;
			this.server.listen(tcp_port, function () {
				console.info('[tcpServer] started at port：' + tcp_port);
				callback && callback();
			});
		} else {
			callback && callback();
		}
	}
}
module.exports = TcpServer;
