const path = require("path");
const { configure, getLogger } = require("log4js");
class Logger {
  constructor(config) {
    config.logger = config.logger || {};
    config.communication = config.communication || {};
    this.logger = config.logger;
    let mailer = config.communication.mailer || {};
    mailer.start &&
      (this.mailer = mailer[mailer.server]) &&
      (this.mailer.defaultRecipients = mailer.defaultRecipients);
  }
  init() {
    if (this.logger.start == false) {
      return;
    }
    //级别：OFF、FATAL、ERROR、WARN、INFO、DEBUG、ALL
    let appenders = {
      stdout: {
        type: "console",
        // layout: {
        // 	type: 'pattern',
        // 	pattern: '%r %p %c - %m%n'
        // }
      },
    };
    let categories = {
      default: {
        appenders: ["stdout", "info"],
        level: "info",
      },
    };
    let levels = ["debug", "info", "error"];
    levels.map((item) => {
      appenders[`${item}`] = {
        type: "dateFile",
        filename: path.join(this.logger.rootDir, item, item),
        pattern: "yyyy-MM-dd.log",
        alwaysIncludePattern: true,
        compress: false,
        encoding: "utf-8",
      };
      categories[`${item}`] = {
        appenders: ["stdout", item],
        level: item,
      };
    });
    if (this.mailer) {
      appenders.mailer = {
        type: "@log4js-node/smtp",
        recipients: this.mailer.defaultRecipients,
        transport: "SMTP",
        subject: `[notice] ${
          (NKGlobal.config.project && NKGlobal.config.project.name) || "NK"
        }`,
        sender: this.mailer.auth.user,
        SMTP: this.mailer,
      };
      categories.mailer = {
        appenders: ["mailer"],
        level: "error",
      };
    }
    configure({
      appenders: appenders,
      categories: categories,
    });
    let consoleLog = getLogger("info");
    let error = getLogger("error");
    let debug = getLogger("debug");
    console.error = error.error.bind(error);
    console.warn = consoleLog.warn.bind(consoleLog);
    console.log = consoleLog.info.bind(consoleLog);
    console.info = consoleLog.info.bind(consoleLog);
    console.debug = debug.debug.bind(debug);
    if (this.mailer) {
      console.info("[Email] reminder service started");
      let mailLog = getLogger("mailer");
      console.mail = mailLog.error.bind(mailLog);
    } else {
      console.mail = function () {
        console.error(
          "[Email] please open reminder service,config->communication->mailer->start"
        );
      };
    }
  }
}
module.exports = Logger;
