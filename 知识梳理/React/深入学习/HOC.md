# 高阶组件 HOC

1. 高阶组件是增强组件功能的一个函数
2. 高阶组件的作用，是对多组件公共逻辑 进行 横向 抽离


## 高阶组件是一个函数

官方定义： 高阶组件，是参数为组件，返回值为新组件的 **函数**

```jsx
const EnhancedComponent = higherOrderComponent(WrappedComponent);

```

## 案例

```jsx
// 子组件
import React from 'react';

function ChildCom1(props) {
    return (
        <div>
            子组件1
            姓名：{props.name}
        </div>
    );
}

export default ChildCom1


// 高阶组件
import { useEffect } from "react";
import { formatDate } from "../utils/tools"

// 高阶组件是一个函数，接收一个组件作为参数
// 返回一个新的组件
function withLog(Com) {
  // 返回的新组件
  return function NewCom(props) {
    // 抽离的公共逻辑
    useEffect(() => {
        console.log(`日志：组件${Com.name}已经创建，创建时间${formatDate(Date.now(),"year-time")}`);
        return function(){
            console.log(`日志：组件${Com.name}已经销毁，销毁时间${formatDate(Date.now(),"year-time")}`);
        }
    },[]);
    // 一般来讲，传入的组件会作为新组件的视图
    return <Com {...props}/>;
  };
}

export default withLog;



```

```js
// 引用
import { useState, useEffect } from "react";

// 高阶组件是一个函数，接收一个组件作为参数
// 返回一个新的组件
function withTimer(Com) {
  // 返回的新组件
  return function NewCom(props) {
    // 抽离的公共逻辑
    const [counter, setCounter] = useState(1);

    useEffect(() => {
      const stopTimer = setInterval(() => {
        console.log(counter);
        setCounter(counter + 1);
      }, 1000);
      return function () {
        clearInterval(stopTimer);
      };
    });

    // 一般来讲，传入的组件会作为新组件的视图
    return <Com {...props} />;
  };
}

export default withTimer;
```


## 高阶组件的现状

高阶组件是为了解决，早期类组件的公共逻辑抽离的问题，当React开发转为函数式编程，抽离共建共逻辑也能够非常简单的使用自定义hook来实现。

