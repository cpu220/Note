# plugin 

loader 的功能定位，是转换代码，而一些其他的操作难以使用loader完成，比如：
- 当webpack 生成文件时，顺便多生成一个 描述文件
- 当webpack 编译启动时，控制台 输出一句话表示 webpack 启动了

这种类似的功能需要把功能 嵌入 webpack 的编译流程中，而这种事情的实现是依托于 plugin 的



plugin 的【本质】 是一个带有 apply 方法的对象

```javascript
const plugin = {
    apply: function (compiler){
        // 插件逻辑，compiler是webpack的编译器实例
    }
}
```

通常，习惯上，我们会将该对象写成构造函数的模式
```js
// src/MyCustomPlugin.js
class MyCustomPlugin {
  constructor(options) {
    // options 是插件的配置选项
    this.options = options || {};
  }

  apply(compiler) {
    // 注册事件
    // 在构建流程中挂载到特定的钩子
    console.log('插件执行')
    compiler.hooks.compilation.tap('MyCustomPlugin', (compilation) => {
      compilation.hooks.buildModule.tap('MyCustomPlugin', (module) => {
        if (module.resource) {
          // 获取模块的绝对路径
          const resource = module.resource;
    
          // 在这里可以执行你想要的操作，例如读取模块的源代码等
          console.log('Resource=>>>>', resource);
        }
      });
    });
    
    compiler.hooks.beforeCompile.tapAsync('MyCustomPlugin', (params, callback) => {
      // 注意：beforeCompile阶段还没有compilation对象
      // params是一个包含normalModuleFactory的对象
      console.log('Before compile:', params.normalModuleFactory);
      callback(); // 必须调用callback结束异步钩子
  });

  compiler.hooks.beforeRun.tap('MyCustomPlugin',function(compiler){
     // beforeRun钩子接收的是compiler对象，不是compilation
     console.log('Before run');
  })



    compiler.hooks.emit.tap('MyCustomPlugin', (compilation) => {
      // 确保在 emit 阶段才访问 compilation.assets
      const assets = compilation.assets;

      // 例：查找和修改 JS 文件
      Object.keys(assets).forEach((assetName) => {
        if (assetName.endsWith('.js')) {
          const asset = assets[assetName];
          const content = asset.source();

          // 修改资源内容...
          // const modifiedContent = modifyContent(content);

          // 创建一个新的资源，替换原来的资源
          // compilation.assets[assetName] = new webpack.sources.RawSource(modifiedContent);
        }
      });
    });

    ///
  }
}

module.exports = MyCustomPlugin;

```

要将插件应用到webpack，需要把插件对象配置到 webpack的plugins数组 中，方法如下

```javascript
// webpack.config.js
module.exports = {
    plugins: [
        new MyCustomPlugin({
            // 插件的配置选项
            outputFile: 'custom-output.txt'
        })
    ]
}```

compiler 对象是在初始化阶段构建的，整个webpack打包期间只有一个compiler对象，它代表了webpack的完整配置和环境

apply方法会在创建好compiler对象后立即调用，并向方法传入compiler对象本身

当文件发生变化（watch模式）时，compiler不会重新调用apply方法，而是会创建一个新的compilation对象来代表一次新的编译过程。apply方法只会在webpack启动时被调用一次，而不是每次编译都会调用


compiler 对象提供了丰富的钩子（hooks），可以在不同的编译阶段挂载自定义的操作。这些钩子允许插件在编译过程中插入自定义逻辑，实现对打包过程的定制化。

```js

class myPlugin {
    apply( compiler){
        compiler.hooks.事件名称.事件类型('插件名称',function(compilation){
            // 事件处理函数
        })
    }
}

```

## 事件类型
这一部分使用的是 Tapable API，这是webpack内部使用的一个小型库，专门用于钩子函数的创建和管理。它提供了以下几种事件监听类型：

- tap：注册一个同步的钩子函数，函数运行完毕则表示事件处理结束
- tapAsync：注册一个异步的钩子函数，函数需要显式调用传入的callback参数才能表示事件处理结束
- tapPromise：注册一个返回Promise的钩子函数，Promise resolve后表示事件处理结束

```js
compiler.hooks.done.tapAsync('插件名称', function(stats, callback){
    // done钩子接收的是stats对象，不是compilation
    console.log('Build completed:', stats.compilation.name);
    callback(); // 异步钩子需要调用callback
});

// 或者使用tapPromise
compiler.hooks.done.tapPromise('插件名称', async function(stats){
    // 处理逻辑
    await someAsyncOperation();
    return Promise.resolve(); // Promise需要resolve
});
``` 
其实就是类似于 window.addEventListener('load',function(){})

> webpackjs.com/api/compiler-hooks#done

## 处理函数
- 不同钩子的处理函数接收不同的参数，并不都是compilation
  - 有些钩子接收compiler对象（如beforeRun）
  - 有些钩子接收compilation对象（如emit、compilation钩子内的子钩子）
  - 有些钩子接收stats对象（如done）
  - 有些钩子接收参数对象（如beforeCompile接收包含normalModuleFactory的params）
  - 具体参数类型需要参考webpack官方文档中对应钩子的说明