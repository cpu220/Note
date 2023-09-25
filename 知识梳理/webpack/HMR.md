# 热替换 HMR （Hot Module Replace）

> 热替换并不能降低构建时间（可能还会增加），但可以降低代码改动到效果呈现的时间。

* 原流程
  1. 代码变动
  2. 重新打包
  3. 浏览器刷新，重新请求所有资源
  4. 浏览器执行代码
* 热替换流程
  1. 代码变动
  2. 重新打包
  3. 浏览器仅请求改动的资源
  4. 浏览器执行代码


## webpack 配置
```

module.exports ={
    devServer:{
        hot:true // 开启HMR
    },
    plugins:[
        new webpack.HotModuleReplacementPlugin() ,  // webpack 4 之前需要手动引入，之后默认引用
    ]
}
```


- 当开启了热更新后，webpack-dev-server 会向打包结果中注入 module.hot 属性
- 默认情况下，webpack-dev-server不管是否开启了热更新，当重新打包后，都会调佣金location.reload刷新页面，但如果运营了Module.hot.accept()，将改变这一行为。
  - module.hot.accept 的作用是让webpack-dev-server 通过socket管道，把服务器更新的内容发送到炼器
  - 然后，将结果交给插件 **MHotModuleReplaceMementPlugin** 注入的代码执行
  - 插件 **MHotModuleReplaceMementPlugin** 会根据覆盖原始代码，然后让代码重新执行

```js
if(module.hot){
    module.hot.accept('./index.js',()=>{
        console.log('index.js更新了')
    })
}
```

所以，热替换发生在代码运行期。

## 样式热替换

对于样式也是可以发生热替换，但需要使用 style-loader
因为热替换发生时，**MHotModuleReplaceMementPlugin** 只会简单的重新运行模块代码，因此style-loader的代码一运行，就会重新设置style元素中的样式
而**mini-css-extract-plugin** 由于它生成文件实在构建期间，运行期间也不会改动文件，因此它对热替换是无效的。

但是，js里面由于引入css的是 **import "./index.css"** ，因此，当css发生变化时，会重新执行index.js，index.js里面的代码也会重新执行，这就导致了webpack会重新执行style-loader的代码，所以css会热更新