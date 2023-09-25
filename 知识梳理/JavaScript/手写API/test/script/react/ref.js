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