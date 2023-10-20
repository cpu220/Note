 # webpack 生成阶段做了什么?

 构建阶段围绕module展开，生成阶段则围绕chunks展开，
 经过构建阶段之后，webpack得到足够的模块内容与模块关系信息，之后通过Compilation.seal函数生成最终资源。

 ## 生成产物

 执行Compilation.seal 进行产物的封装

 1. 构建本次编译的ChunkGraph 对象,执行 buildChunkGraph,这里会将import(),require.ensure等方法生成的动态模块添加到chunks中
 2. 遍历Compilation.modules集合，将module按entry动态引入 的规则分配给不同的Chunk对象。
 3. 调用Compilation.emitAssets方法将assets信息记录到Compilationassets中。
 4. 执行hooks.optimizeChunkModules的钩子，这里开始进行代码生成和封装。
   - 执行一系列钩子函数（reviveModules，moduleld，optimizeChunklds）
   - 执行createModuleHashes，为每个模块生成hash
   - 执行javascriptGenerator 生成模块代码，这里会遍历modules，创建构建人物，循环使用javascriptGenerator生成代码，这时会将impoer等模块引入放入替换为webpack_require等，并将生成结果存入缓存中。
   - 执行processRuntimeRequireMents,根据生成的内容所使用到的webpack_require等方法，生成对应的代码。
   - 执行createHash创建chunk的hash
   - 执行clearAssets 清除 chunk 的files和auxiliary， 这里缓存的是生物的chunk的文件名，主要是清除上次构建产生的飞起内容。



   ## 文件输出

   回到compiler的流程中，执行onCompiled的回调。
   1. 触发shouldEmit 钩子函数，这里是最后能优化产物的钩子。
   2. 遍历module集合，根据entry配置及引入资源的方式，将module分配到不同的chunk中。
   3. 遍历chunk集合，调用Compilation.emitAsset方法，标记chunk的输出规则，即转化为assets集合。
   4. 写入本地文件，用的是webpack函数执行时初始化的文件流工具。
   5. 执行done狗子函数，这里会执行compiler.run（）的回调，再执行compiler.close(),然后执行持久化存储，最后执行回调函数。


