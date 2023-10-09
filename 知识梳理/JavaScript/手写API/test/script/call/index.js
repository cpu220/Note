
// obj.apply(this, [])
// const res = obj.bind(this, 'aaa')


// apply   

Function.prototype.myApply = function (ctx, args) {
    if (ctx === undefined || ctx === null) {
        ctx = globalThis;
    } else {
        ctx = Object(ctx)
    }

    const _arr = args ? args : []
    const fn = this;
    const key = Symbol()

    Object.defineProperty(ctx, key, { value: fn })

    const result = ctx[key](..._arr)
    delete ctx[key]

    return result


}


function sayHello(greeting) {
    console.log(greeting + ", " + this.name);
}




let person1 = { name: "Alice" };
let person2 = { name: "Bob" };

sayHello.myApply(person1)
sayHello.myApply(person2, 'aaa')


console.log('============')
// obj.call(this, 'hello')

Function.prototype.myCall = function (ctx, ...args) {
    if (ctx === undefined || ctx === null) {
        ctx = globalThis
    } else {
        ctx = Object(ctx)
    }


    const key = Symbol()
    const fn = this;
    Object.defineProperty(ctx, key, { value: fn })
    const result = ctx[key](...args)
    delete ctx[key]
    return result
}

function method(a, b) {
    console.log(this, a, b)
    return a + b
}
// method(2,9)
method.myCall(123, 2, 3)

method.call('123', 4, 5)


console.log('============')


Function.prototype.myBind = function(ctx){
    const arr1  = Array.prototype.slice.call(arguments,1)
    const fn = this

    return function _bind(){
        const arr2 = Array.prototype.slice.call(arguments)
        const _arg = [].concat(arr1,arr2)

        if(  _bind.prototype === Object.getPrototypeOf(this)){
            const obj = {}

            // Object.setPrototypeOf(obj,fn.prototype)
            obj.__proto__ = fn.prototype
            fn.apply(obj,_arg)
            return obj

        }else{
            return fn.apply(ctx,_arg)    
        }
    }


}
function fn(a, b, c, d) {
    console.log(a, b, c, d);
    console.log(this);
    return 123
}
const newFn = fn.myBind('ctx', 1, 2);
const result = new newFn(3, 42) 

console.log('============')

// new

function myNew (fn,...args){
    // 创建一个新的对象
    // const  obj = Object.create(fn.prototype)
    const obj = {}
    obj.__proto__ = fn.prototype

    const result = fn.apply(obj,args)

    if(typeof result === 'object' && result !== null) {
        return result
    }else {
        return obj
    }

}

function person(name,age) {
    this.name = name||'张三'
    this.age = age||18
    this.say = function () {
        console.log(`${this.name} is ${this.age} years old`)
    }
}


const person3 = myNew(person,'李四',20)
const person4 = myNew(person,'王五',30)
person3.say()
person4.say()

