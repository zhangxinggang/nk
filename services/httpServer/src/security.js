var NKDiffieHellman = require("./diffieHellman.js");
var NodeRSA = require("node-rsa");
var crypto = require("crypto");
module.exports = {
  MD5: {
    encryptPwd: function (str) {
      return module.exports.MD5.encrypt(str);
    },
    encrypt: function (str) {
      return crypto.createHash("md5").update(str, "utf8").digest("hex");
    },
  },
  DiffieHellman: {
    /**
     * 公钥加密
     * @param {string} str 要加密的字串
     * @return {string} 加密后的字串。
     */
    encrypt: function (str) {
      var encoder = new NodeRSA(NKDiffieHellman.public_pkcs8, {
        encryptionScheme: "pkcs1",
      });
      var encryptedStr = encoder.encrypt(str, "base64", "utf8");
      return encryptedStr;
    },
    /**
     * 私钥解密
     * @param {string} str 要解密的字串
     * @return {string} 解密后的字串
     */
    decrypt: function (str) {
      var decoder = new NodeRSA(NKDiffieHellman.private_pkcs1, {
        encryptionScheme: "pkcs1",
      });
      var strRaw = decoder.decrypt(str, "utf8");
      return strRaw;
    },
    /**
     * 私钥签名。为字串计算一个较短的特征字串。
     * @param {string} str 要签名的字串
     * @return {string} 签名后的字串
     */
    sign: function (str) {
      var encoder = new NodeRSA(NKDiffieHellman.private_pkcs1, {
        encryptionScheme: "pkcs1",
      });
      var signedStr = encoder.sign(str, "base64", "utf8");
      return signedStr;
    },
    /**
     * 公钥验证。验证字串是不是与某个签名匹配。
     * @param {string} str 要验证的字串。
     * @param {string} signature 签名。
     * @return {boolean} 是否匹配。
     */
    verify: function (str, signature) {
      var decoder = new NodeRSA(NKDiffieHellman.public_pkcs8, {
        encryptionScheme: "pkcs1",
      });
      return decoder.verify(str, signature, "utf8", "base64");
    },
  },
};
