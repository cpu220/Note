
# bundle.js
- 转换后的代码
- 包含了源码对应的地图， 格式为 //# sourceMappingURL = bundle.map


# bundle.map 
- 记录了原始代码
记录了转换后的代码和原始代码的对应关系

# 运行流程

1. 浏览器先请求bundle.js
2. 遇到报错后，就会基于代码中的 //# sourceMappingURL = bundle.map 。请求bundle.map

3. chrome报错，执行对应的evel ，   从而解决打包后代码定位的问题。


# 使用规范
1. source map 只在开发环境使用，作为调试手段，不建议在生产环境中使用。
2. source map 文件较大，会造成额外的网络传输，暴露原始代码。



