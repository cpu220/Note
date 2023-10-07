```js


function myNew(fn,...args){
    // 创建一个新对象，并将其原型指向其构造函数的原型
    const obj = Object.create(fn.prototype)
    // 将构造函数的this指向新对象，并调用构造函数
    const result = fn.apply(obj,args)

    // 如果构造函数返回的对象是个函数，那就直接返回
    if(typeof result === 'object' && result !== null){
        return result
    }
    // 负责返回新对象
    return obj

}

function _myNew(fn,...args){
    const obj = {}
    obj.__proto__ = fn.prototype
    fn.apply(obj,args)
    return obj
}


```