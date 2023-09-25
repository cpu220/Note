
# css-loader
作用是将css代码转化为js代码
处理原理： 将css代码作为字符串导出


## 案例一
```
.red{ color:#f00}

```

经过css-loader转换后，变成了js代码
```
module.exports = ".red{ color:#f00}"

// 大致原理是这样，实际上插件做了很多的事情。

```

## 案例二  

```
.red{ color:#f00}
background: url('./img/1.png')

```
经过css-loader转换后，变成了js代码
```
var img = require('./img/1.png')
module.exports =`
    .red{
        color:#f00;
        background: url("${img}")
        
    }

`

```

于是，经过webpack的后续处理，会把 图片添加到模块列表，然后再将代码转化为

```

var img = _webpack_require_('./img/1.png')
module.exports =`
    .red{
        color:#f00;
        background: url("${img}")
        
    } 
`

```

## 案例三

```
@import './reset.css';
.red{
     color:#f00;
     background: url('./img/1.png')
}


```

转化为

```
var import1 = require('./reset.css')
var import2 = require('./img/1.png')
module.exports =`
    ${import1}
    .red{
        color:#f00;
        background: url("${import2}")
        
    } 
`

```

1. 将css文件的内容，作为字符串导出
2. 将css中的依赖作为require导入，方便webpack分析依赖


# style-loader
由于css-loader 仅提供了css转换为字符串导出的能力，剩余的事情交给其他loader和plugin来处理

style-loader可以将css-loader转化后的代码进一步处理，将css-loader导出的字符串，转化为style标签插入到页面中

```

module.exports =`

.red{
    color:#f00; 
}

var style  = module.exports;
var styleELem = document.createElement('style')
styleELem.innerHTML = style
document.head.appendChild(styleELem)
module.exports = style
 

`

```

# css module

```
{
    test: /\.css$/,
    use: [
        // "./loaders/style-loader.js"
        "style-loader",
        {
        loader: "css-loader",
        options: {
            modules: {
            localIdentName: '[path][name]__[local]--[hash:5]' // 指定css的类名格式
            
            },
        }
        }
    ]
},

```

## 注意点
1. css module 往往配合构建工具使用
2. css module 仅处理顶级类名，尽量不要书写嵌套的类名，也没有这个必要
3. 仅处理类名，不会处理其他选择器
4. 会处理id 选择器，不过任何时候，都没有使用id选择器的理由
5. 使用了css module 后，只要能做到让类名望问知意即可，不需要遵守其他任何的命名规范
