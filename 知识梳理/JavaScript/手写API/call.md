
# call
用来改变函数中this的指向
- 可以接受多个参数，第一个参数是this，指向对象，后面的参数是函数实际参数，用逗号分隔。
- 如果第一个参数是null或者undefined，那么this指向全局对象window（非严格模式下）。在严格模式下，this就是null或undefined本身。
- 如果第一个参数是原始值，那么this指向原始值的自动包装对象，比如String、Number、Boolean。
- 如果第一个参数是一个对象，那么this指向这个对象。
- 如果第一个参数是一个函数，那么this指向这个函数对象本身。
- 如果第一个参数是一个类（构造函数），那么this指向这个类（构造函数）本身。
- **注意**：call/apply/bind 对箭头函数无效！箭头函数的this在定义时就确定了，无法通过call/apply/bind改变。箭头函数的this始终指向定义时的外层作用域的this。



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
    - func.bind(obj,arg1,arg2,...) bind方法不会立即执行函数，而是返回一个新的函数，新函数的this指向第一个参数，后面的参数是函数的实际参数，用逗号分隔。


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
- 与call方法类似，只是参数传递方式不同，apply方法接受2个参数
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
// 解析：apply是作用在call.call上
// 等价于：call.call((a)=>a, 1, 2)
// 进一步分析：call.call(fn, arg1, arg2) 相当于 fn.call(arg1, arg2)
// 所以相当于：((a)=>a).call(1, 2)
// 由于箭头函数的this无法改变，实际执行：((a)=>a)(2)
// 结果：返回 2（箭头函数接收参数2并返回）


```

- call 是 Function.prototype 上的方法，所有函数都能调用它。所以 console.log.call === Function.prototype.call

``` js

function a(){} // 这是声明了一个普通函数a

 a.call === Function.prototype.call  // true
 a.prototype.call === Function.prototype.call // false, 因为， 这时候的a，是构造函数a的实例对象，不是函数对象，所以没有call这个方法
 a.prototype.constructor.call === Function.prototype.call // true, 因为， 这时候的a.prototype.constructor，是函数a本身，所以有call这个方法

```