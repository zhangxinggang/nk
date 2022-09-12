module.exports = function (sender) {
  setTimeout(() => {
    sender.success("动态路由");
  }, 3000);
};
