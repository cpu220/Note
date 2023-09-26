# React 和 Vue 描述页面的区别

react中使用的是jsx，vue使用的是模板来描述页面

经过一段时间的发展，目前主流的描述UI方案： jsx、模板


## jSX历史来源

jsx最早起源于React 团队在React 中所提供的一种类似XML 的ES 语法糖

```jsx

const element = <div>hello world<div>
```

经过babel编译之后，就会变成

```jsx
// react v17之前
var element = React.createElement("div",null,"hello world")

// react v17 之后
var jsxRuntime = require('react/jsx-runtime')
var element = jsxRuntime.jsx("hi",{children:"hello world"})

```

无论是哪个版本，最后都会得到一个对象,这就是虚拟DOM
    ``` js
{
    type:'div',
    key:'null',
    ref:null,
    props:{
        children:'hello world'
    },
    _owner:null,
    _store:{}
}


```

React 团队认为，UI 本质上和逻辑是有耦合部分的
- 在ui上面绑定事件
- 数据变化后通过js去改变UI的样式或者结构
作为一个前端工程师，JS是用的最多的，所以React团队思考屏蔽HTML，整个都用JS来描述UI，因为这样做的话，可以让UI的逻辑配合的更加紧密，所以最终设计出来了类XML的js 语法糖
- 由于jsx 是js的语法糖（本质上就是js），所以非常灵活的和js语法组合使用

 