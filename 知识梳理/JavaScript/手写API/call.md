
# call
用来改变函数中this的指向
- 可以接受多个参数，第一个参数是this，指向对象，后面的参数是函数实际参数，用逗号分隔。
- 如果第一个参数是null或者undefined，那么this指向全局对象window。
- 如果第一个参数是原始值，那么this指向原始值的自动包装对象，比如String、Number、Boolean。
- 如果第一个参数是一个对象，那么this指向这个对象。
- 如果第一个参数是一个函数，那么this指向这个函数的实例对象。
- 如果第一个参数是一个类，那么this指向这个类的实例对象。
- 如果第一个参数是一个箭头函数，那么this指向这个箭头函数的外层函数的this，如果外层函数没有this，那么this指向全局对象window。



- func.call(obj,arg1,arg2,...) call方法会立即执行函数，并返回函数的返回值



``` js
function say(param){
    console.log(`${param}:${this.name}`)
}

let person1 = {name:'张三'}
let person2= {name:'李四'}

say.call(person1,'hello'); // hello:张三
say.call(person2,'hello'); // hello:李四

 
 
```




# bind
- 第一个参数是this的指向对象，后面的参数是函数的实际参数，用逗号分隔。
    - func.call(obj,arg1,arg2,...) bind方法不会立即执行函数，而是返回一个新的函数，新函数的this指向第一个参数，后面的参数是函数的实际参数，用逗号分隔。


``` js
function say(param){
    console.log(`${param}:${this.name}`)
}

let person1 = {name:'张三'}
let person2= {name:'李四'}
 

let sayHi = say.bind(person1,'hi'); // 返回一个新的函数
let sayHello = say.bind(person2,'hello'); // 返回一个新的函数

sayHi(); // hi:张三
sayHello(); // hello:李四


```

# apply
- 与call方法类似，只是参数传递方式不同，apply方案接受2个参数
    - 第一个参数是this的指向对象
    - 第二个参数是函数的实际参数，以数组的形式传入。
        - func.apply(this,[arg1,arg2,...]) apply方法会立即执行函数，并返回函数的返回值

``` js
function say(param){
    console.log(`${param}:${this.name}`)
}

let person1 = {name:'张三'}
let person2= {name:'李四'}
 

say.apply(person1,['hi']); // hi:张三
say.apply(person2,['hello']); // hello:李四

```


---


``` js


console.log.call.call.apply((a)=>a,[1,2])
// apply是作用在前面的一个函数，也就是call
// 对象就是 (a)=>a,   实际参数是1 ,2
// (1,2)=>a,


```