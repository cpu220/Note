//  obj.apply(this,[])
Function.prototype.myApply = function (ctx, args) {

    // 1. 先确定 ctx
    if (ctx === void 0 || ctx === null) {
        ctx = globalThis
    } else {
        ctx = Object(this)
    }

    // 2. 确认参数
    const _arr = args ? args : []
    const fn = this;
    //  3. 创建唯一key
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

Function.prototype.myCall = function (ctx, ...args) {
    // 1. 先确定 ctx
    if (ctx === void 0 || ctx === null) {
        ctx = globalThis
    } else {
        ctx = Object(this)
    }

    const fn = this;
    const key = Symbol()

    Object.defineProperty(ctx, key, { value: fn })
    const result = ctx[key](...args)
    delete ctx[key]

    return result
}

function method(a, b) {
    console.log(this, a, b, a + b)

    return a + b
}
// method(2,9)
method.myCall(123, 2, 3)

method.call('123', 4, 5)

console.log('============')


// const res = obj.bind(this,a,b)
//  res (c,d)
Function.prototype.myBind = function (ctx) {
    const fn = this;
    const arr1 = Array.prototype.slice.call(arguments, 1)

    return function _bind() {
        const arr2 = Array.prototype.slice.call(arguments)
        const _arr = [].concat(arr1, arr2)

        if (Object.getPrototypeOf(this) === _bind.prototype) {
            const obj = {}
            Object.setPrototypeOf(obj, fn.prototype)
            fn.apply(obj, _arr)
            return obj
        } else {
            return fn.apply(ctx, _arr)
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

function myNew(fn, ...args) {
    // 创建一个对象
    // 让这个对象的原型为 fn 的原型属性
    const obj = Object.create(fn.prototype)

    const result = fn.apply(obj, args)
    if (typeof result === 'function' && result !== null) {
        return result
    } else {
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