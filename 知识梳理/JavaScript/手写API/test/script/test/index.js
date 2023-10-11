function logTime(target, name, descriptor) {
    // 保存原始的函数
    const original = descriptor.value;
    // 修改 descriptor.value 为一个新的函数
    descriptor.value = function (...args) {
        // 打印当前时间
        console.log(new Date());
        // 调用原始的函数，并返回结果
        return original.apply(this, args);
    };
    // 返回修改后的 descriptor
    return descriptor;
}

// 定义一个类
class Person {
    constructor(name) {
        this.name = name;
    }
    // 使用装饰器来修饰 sayHello 方法
    @logTime
    sayHello() {
        console.log(`Hello, I am ${this.name}`);
    }
}


// 创建一个实例
let p = new Person("Alice");
// 调用 sayHello 方法，会同时打印出时间和问候语
p.sayHello();