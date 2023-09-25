# webpack 构建阶段做了什么?

在webpack函数执行完之后，就到主要的构建阶段，首先执行compiler.run(), 然后出发一系列钩子函数，执行compiler.compile()



1. 在实例化compiler之后，执行compiler.run()
2. 执行newCompilation函数，调用createCompilation初始化compilation对象。
3. 执行 _addEntryitem 将入口文件存入 this.entries（map对象），遍历this.enttries对象构建chunk
4. 执行handleModuleCreatrion，开始创建模块实例
5. 执行moduleFactory.create创建模块实例
    - 执行 factory.hooks.factorize.call 钩子，然后会调用 ExternalModuleFactoryPlugin 中注册的钩子，用于配置外部文件的模块加载方式。
    - 使用 enhanced-resolve 解析模块和 loader 的真实绝对路径。
    - 执行 new NormalModule()创建 module 实例。
6. 执行addModule，存储module。
7. 执行buildModule，添加模块到模块队列 buildQueue 中。开始构建模块，这里会调用normalModule中的build开启构建。
    - 创建loader上下文
    - 执行runLoaders，通过enhanced-resolve 解析得到的模块和loader的路径，获取函数，执行loader
    - 生成模块的hash。
8. 所有依赖都解析完毕后，构建阶段结束。

``` js

  // 构建过程涉及流程比较复杂，代码会做省略

  // lib/webpack.js 1284行
  // 开启编译流程
  compiler.run((err, stats) => {
    compiler.close(err2 => {
      callback(err || err2, stats);
    });
  });

  // lib/compiler.js 1081行
  // 开启编译流程
  compile(callback) {
    const params = this.newCompilationParams();
    // 创建 Compilation 对象
    const Compilation = this.newCompilation(params);
  }

  // lib/Compilation.js 1865行
  // 确认入口文件
  addEntry() {
    this._addEntryItem();
  }

  // lib/Compilation.js 1834行
  // 开始创建模块流程，创建模块实例
  addModuleTree() {
    this.handleModuleCreation()
  }

  // lib/Compilation.js 1548行
  // 开始创建模块流程，创建模块实例
  handleModuleCreation() {
    this.factorizeModule()
  }

  // lib/Compilation.js 1712行
  // 添加到创建模块队列，执行创建模块
  factorizeModule(options, callback) {
    this.factorizeQueue.add(options, callback);
  }

  // lib/Compilation.js 1834行
  // 保存需要构建模块
  _addModule(module, callback) {
    this.modules.add(module);
  }

  // lib/Compilation.js 1284行
  // 添加模块进模块编译队列，开始编译
  buildModule(module, callback) {
    this.buildQueue.add(module, callback);
  }
```