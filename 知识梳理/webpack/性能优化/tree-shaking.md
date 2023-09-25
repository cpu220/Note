# tree-shaking
用来移除模块之间的无效代码

只要是生产环境，tree-shaking都会自动开启

## 原理

webpack 慧聪家入口模块出发，寻找依赖关系
当解析一个模块时，webpack会根据es6的模块导入语句来判断，该模块依赖了另一个模块的导出

webpack之所以选择es6 的模块导入语句
- 导入导出语句只能是顶层语句
- import 的模块名只能是字符串敞亮
- import 绑定的变量是不可变的

如果依赖的是一个导出对象，由于js语言的动态特性，以及webpack还不够职能，为了保证代码正常运行，它不会移除对象中的任何信息。

因此，在编写代码的时候，尽量：
1. 使用export xx 导出，而不使用 export default {} 导出
2. 使用import {} from xxx 或者  import * as xx from xxxx 导入，而不使用  import xx from xxxx 导入

依赖分析完毕后，webpack会根据每个模块每个导出是否被使用，标记其他导出为 dead code，然后交给代码压缩工具处理

代码压缩工具最终除掉那些 dead code 代码
 
## 第三方库
某些第三方库可能使用的是 commonjs 的方式导出，比如 lodash
又或者没有提供普通的es6方式
对于这些库，tree-sharking是无法生效的

因此，要寻找这些库的es6版本，或者使用其他的库，比如 lodash-es

## 作用域分析
tree-sharking 本身并没有完善的作用域，可能导致在一些dead code函数中的依赖仍然会被视为依赖
插件 webpack-deep-scope-plugin 可以解决这个问题

## 副作用问题
webpack在 tree-sharking 的使用，有一个原则： 一定要保证代码正确运行
在满足该原则的基础上，再来决定如何 tree-sharking
因此，当webpack无法确定某个模块是否有副作用时，它会保留该模块的所有导出
因此，某些情况可能并不是我们所想要的。

```
// common.js

var n = Math.random()

// index.js

import './common.js'

```

虽然我们根本没用 common.js 的导出，但webpack担心common.js有副作用，如果去掉会影响某些功能
如果要解决该问题，就需要标记该文件是没有副作用的

在package.json 中加入 sideEffects

```

"sideEffects":false // 表示该项目中所有的文件都没有副作用

"sideEffects":["./src/index.js"] // 表示该项目中所有的文件都没有副作用，除了index.js


```



