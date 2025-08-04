## nk

> nk nodejs keep

## 功能清单

- [√] http 服务器
- [√] 应用代理
- [√] 静态资源服务器
- [√] 路由权限控制，静态文件权限控制
- [√] 邮件服务
- [√] 自动执行任务
- [x] rtmp 服务器
- [x] rtsp 服务器
- [x] tcp 服务器
- [x] udp 服务器

## 使用方法

demo 运用地址：https://github.com/zhangxinggang/LocalMusicPlayer.git

1. git clone https://github.com/zhangxinggang/NK.git
2. 新起项目，新建一个文件内容如下(例如为 index.js)，路径根据实际情况而定

```js
const services = require('@zhangxg/nk');
const config = require('./config');
services(config);
```

3. npm install
4. node index.js

## config 文件内容

详细见 NK 目录下的 config.js

```
services
    --rtmpServer
    --rtspServer
    --tcpServer
    --udpServer
    --httpServer
        --protocols 协议
        --security 安全
            secret jwt加密的密钥
            tokenExpiresIn jwt过期时间
            noAuthorityRoutes 访问白名单，通配符
        --routes 路由
            dynamicRouteDirs 动态路由
            mountRouteDirs 挂载路由
            staticDirs 静态路由
            路由都为一个数组，数组的每一项有三个字段rootDir 必须 路由包含目录，rootPath 命名空间，默认/，auth 是否需要权限，默认true
        --proxy 路由代理
        --autoRunTask 自动运行服务
        --storage 存储服务
        --logger 日志设置
        --communication 邮件服务
        --project 你项目所需的字段，自定义
```

## demo 路由地址（在 config 未配置的情况下）

静态路由带权限：http://127.0.0.1:8081/public/index.html

动态路由：http://127.0.0.1:8081/dynamic/test

挂载路由：http://127.0.0.1:8081/mount/weibos

## 术语

> koa 基于 Node.js 平台的下一代 web 开发框架

> 中间件，类似于水管管道，水从一个方向流向另一个方向，中间件好比从中间接了一根水管，控制水流，监测水流等操作

> jsonwebtoken

```
由Header(头部)，主要包括加密算法和加密类型，
Payload(负载)，主要包括，发行者，过期时间，发行时间，业务数据等等
Signature(签名)，主要是对前两部分的签名，防止数据篡改
```
