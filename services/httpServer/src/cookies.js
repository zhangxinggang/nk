let name = (NKGlobal.config.project || {}).name || "nk";
module.exports = {
  token: name + "-access-token",
};
