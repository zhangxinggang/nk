/**
 * @global
 * @namespace 通讯
 */
/**
 * @constructor
 * @name "Communication"
 * @description 邮件发送
 * @memberof 通讯
 * @param {string} from 发送头名称
 * @param {string|Array} to 收到短信的邮箱
 * @param {string} subject 邮件主题
 * @param {string} [text] 文本
 * @param {string} [html] html
 * @param {Array} [attachments] 附件 [{filename:'',path:''}]
 * @return {object} <pre>
	返回邮件发送成功信息：
	{
		{
			accepted: [ 'xxx@163.com' ],
			rejected: [],
			envelopeTime: 7190,
			messageTime: 4125,
			messageSize: 328,
			response: '250 OK: queued as.',
			envelope:{
				from: 'xxx@qq.com', 
				to: [ 'xxx@163.com' ]
			},
			messageId: '<xxxx@qq.com>' 
		}
	}
 */
const nodemailer = require("nodemailer");

class Communication {
  sendMail(options, cb) {
    NKGlobal.config.communication = NKGlobal.config.communication || {};
    let mailer = NKGlobal.config.communication.mailer;
    let mailConf = mailer[mailer.server];
    let transport = nodemailer.createTransport(mailConf);
    options.from = options.from || mailConf["auth"]["user"];
    options.from = options.from + "<" + mailConf["auth"]["user"] + ">";
    transport.sendMail(options, function (err, info) {
      if (typeof cb == "function") {
        if (err) {
          cb(err);
        } else {
          cb(null, info);
        }
      }
    });
  }
}
module.exports = Communication;
