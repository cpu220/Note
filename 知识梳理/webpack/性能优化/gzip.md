# gzip

1. gzip 是服务器的能力，不是webpack的

## B/S结构中的压缩传输
1. 浏览器发送请求， 请求头携带 Accect-Encoding: gzip,deflate,br 
2. 服务器响应，读取文件
3. 进行压缩，压缩后的文件，放到响应体中
4. 返回给浏览器，Content-Cncoding: gzip，告诉浏览器，这个文件是压缩过的
5. 浏览器接收到响应，解压缩，然后执行

优点： 传输效率可能得到大幅度提升
缺电：服务器的压缩需要时间，客户端的解压需要时间


## 使用webpack 进行压缩
使用 compression-webpack-plugin 插件

```
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CmpressionWebpackPlugin = require("compression-webpack-plugin")
module.exports = {
  mode: "production",
  optimization: {
    splitChunks: {
      chunks: "all"
    }
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CmpressionWebpackPlugin({
      test: /\.js/, , // 匹配文件
      minRatio: 0.5 , // 压缩比例
    })
  ]
};

```

1. 浏览器发送请求， 请求头携带 Accect-Encoding: gzip,deflate,br 
2. 服务器响应，读取文件,判断 *.gzip 是否存在，如果存在，直接返回
3. 返回服务器压缩后的文件 
4. 返回给浏览器，Content-Cncoding: gzip，告诉浏览器，这个文件是压缩过的
5. 浏览器接收到响应，解压缩，然后执行