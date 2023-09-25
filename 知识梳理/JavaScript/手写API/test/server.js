const Koa = require('koa');
const serve = require('koa-static');
const opn = require('opn');
const BrowserSync = require('browser-sync').create();
const webpack = require('webpack');
const webpackMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const path = require('path');

// 导入 webpack 配置
const webpackConfig = require('./webpack.config.js');

const app = new Koa();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'static' directory
app.use(serve('static'));

// Start the Koa server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Open the default browser
  opn(`http://localhost:${PORT}`);
});

// Create a webpack compiler
const compiler = webpack(webpackConfig);

// Configure webpack middleware
const devMiddleware = webpackMiddleware(compiler, {
  publicPath: webpackConfig.output.publicPath,
  stats: {
    colors: true,
    chunks: false,
  },
});

// Configure webpack hot middleware
const hotMiddleware = webpackHotMiddleware(compiler);

// Attach webpack middleware to the Koa server
app.use(async (ctx, next) => {
  await devMiddleware(ctx.req, ctx.res, async () => {
    await next();
  });
});

app.use(async (ctx, next) => {
  await hotMiddleware(ctx.req, ctx.res, async () => {
    await next();
  });
});

// Initialize BrowserSync for automatic reloading
BrowserSync.init({
  proxy: `http://localhost:${PORT}`,
  files: ['static/**/*'], // Watch for changes in the 'static' directory
  online: true,
  notify: false,
  open: false,
});

// Handle browser sync events
compiler.hooks.done.tap('done', () => {
  BrowserSync.reload(); // Reload the browser when webpack is done rebuilding
});
