# Context

Context 如果直接翻译为中文，会被翻译成上下文的意思。所谓的上下文，往往指的是代码执行时所需的数据环境信息。

Context是React提供的一种，在组件树间船体数据的办法，它可以让你在不需要手动添加props的情况下，让某些组件访问到一些全局的数据，Context的作用是解决组件间数据传递的问题，避免了层层传递props的繁琐和低效。

Redux的实现原理，就是基于Context所进行的一层封装。

## 1. Context要解决的问题

下面是一段官方的DEMO

```jsx

const ThemeContext = React.createContext('light');

class APP extends React.Component {
  render() {
    return (
      <ThemeContext.Provider value="dark">
        <Toolbar />
      </ThemeContext.Provider>
    )
  }
}


function Toolbar(props) {
  return (
    <div>
      <ThemedButton />
    </div>
  )
}


class ThemedButton extends React.Component {
    const theme = useContext(ThemeContext);

   render() {
    return (
      <ThemeContext.Consumer>
         <button theme={theme}>按钮</button>
      </ThemeContext.Consumer>
    );
  }
}
 
```

## 2. Context的使用

多个上下文环境，可以嵌套使用




## SSR的使用

``` jsx

// App.jsx
import React, { useState } from 'react';
import { StaticRouter } from "react-router-dom/server";
import RouteApp from '../routes/RouteApp.jsx';
 

import { MyContext1, MyContext2 } from '@/context'


export default ({ location, context, store }) => {

    const [count, setCount] = useState(0)

    return (
        <MyContext1.Provider value={{ a: 111111, b: 2 }}>
            {/* <MyContext2.Provider value={{ a: 3, b: 4 }}> */}
            <MyContext2.Provider value={{ count, setCount }}>
               
                    <StaticRouter location={location} context={context}>
                        <RouteApp />
                    </StaticRouter> 
            </MyContext2.Provider>
        </MyContext1.Provider >


    )
}
```

值得注意的是，如果走SSR渲染，因为同构，需要双端的APP.js代码都保持一致才行，不然会报错
``` jsx