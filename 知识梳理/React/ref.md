# ref 
reference 引用
场景：希望直接使用DOM元素中的某个方法，或者希望直接使用自定义组件中的某个方法


1. ref 作用于内置的html组件，得到的将是这个组件的真实DOM对象
2. ref 作用于类组件，得到的是类的实例对象
3. ref 不能作用于函数组件


目前，ref推荐使用对象或者函数

## 对象
通过React.createRef 创建一个ref对象，将其赋值给组件的ref属性

## 函数
函数的调用时间：
1. componentDidMount 的时候，函数会被调用
    - 在componentDidMounnt中，可以通过this.refs.xxx获取到真实的DOM元素 
2. 如果ref的值发生了变动（旧的函数被新的函数替代），分别调用旧的函数以及新的函数。
    - 时间点出现在componentDidUpdate之前
    - 旧的函数被调用时，传递null
    - 新的函数被调用时，传递对象
3. 如果ref组件被卸载，则调用函数，传递null
    - 时间点出现在componentWillUnmount之前 


## ref 转移

由于函数组件没有实例，所以不能直接使用ref，但是可以通过转发ref的方式，将ref传递给函数组件

```js

cosnt NewA = React.forwardRef(A)

const xxx = React.createRef()

<NewA  ref = {this.xxx }/>


```

 

``` js
import React from 'react'

function A (props,ref){
    return <div ref={ref}>组件A</div>
}
// 传递函数组件A，得到一个新组件newA
const NewA = React.forwardRef(A)

export default class Test extends React.Component {
    constructor(props) {
        super(props)

        this.ARef = React.createRef()

        this.txt2 = React.createRef()
        // 等同于  this.txt = {current:null}
    }


    onClick = () => {
        this.ref.txt1.focus(); //字符串的方式
        this.txt2.current.focus(); //对象的方式
    }

    B = () => {
        <div>333</div>
    }

    render() {
        return (
            <>
                {/* 函数式使用 */}
                <Input ref={
                    (el) => {
                        console.log('函数被调用',el)
                        this.txt3 = el
                    }
                }
                />
                <Input ref={this.txt2} />
                <Input ref={'txt1'} />

                {/* <B ref='compB'/>  */}
                <NewA ref={this.ARef} />

            </>
        )
    }
}

```