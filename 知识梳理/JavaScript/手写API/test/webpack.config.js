const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js', // 入口文件
  output: {
    filename: 'bundle.js', // 输出文件名
    path: path.resolve(__dirname, 'static'), // 输出目录
    publicPath: '/', // 添加 publicPath 属性
  },
  mode: 'development', // 开发模式
  devtool: 'eval-source-map', // 生成 source map 以便调试
  devServer: {
    contentBase: './static', // 服务器的根目录
    hot: true, // 启用热模块替换
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html', // HTML 模板文件
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader', // 使用 Babel 处理 JavaScript 文件
      },
    ],
  },
};
