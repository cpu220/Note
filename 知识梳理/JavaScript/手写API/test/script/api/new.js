function myNew(constructor, ...args) {
    // 创建一个新对象，并将其原型指向构造函数的原型
    const obj = Object.create(constructor.prototype)
    // 将构造函数的this指向新对象没，并调用构造函数
    const result = constructor.apply(obj, args)
    // 如果构造函数返回的是对象，则直接返回该对象
    if (typeof result === 'object' && result !== null) {
        return result;
    }
    // 否则返回新对象
    return obj

}



function person() {
    this.name = '张三'
    this.age = 18
    this.say = function () {
        console.log(`${this.name} is ${this.age} years old`)
    }
}


const person1 = myNew(Person, '李四', 20)
person1.say()