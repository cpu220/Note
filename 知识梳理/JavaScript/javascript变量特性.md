# JavaScript的变量特性与不可变性

## JavaScript 的类型

- 在不考虑ES6、ES7的情况下，JavaScript有7种基本数据类型：Undefined、Null、Boolean、String、Number、Symbol(ES6新增)、BigInt(ES11新增)，以及引用类型Object(包括Array、Function、Date等)。
- JavaScript中原始类型(如Number、String等)不是对象，但JavaScript引擎会在需要时临时将它们包装成对应的包装对象(如Number、String等)来提供方法。
- 那么问题来了，为什么 String、null、Undefined、Number会报错

```js

var a=1; // Undefined
a.b=function(){alert(123);} // function (){alert(123)}
a.b(); // Uncaught TypeError: b.a is not a function
Object.prototype.toString.call(a) // "[object Number]"
Object.prototype.toString.call(a.b) // "[object Undefined]"
a.hasOwnProperty('b') // false

```



为什么会这样？


## JavaScript对象
JavaScript中，对象是引用类型，可以拥有属性和方法。而原始类型(如Number、String等)在JavaScript中不是对象，但在特定操作下会被临时包装成对象。

- 我们通过Object.propertyName来访问对象的属性，通过Object.methodName()来调用对象上的方法。
- 我们可以通过 new Object();来创建一个对象。或者直接var a={};来创建


## JavaScript变量
- 变量是用于存储信息的容器。通常我们用var来声明变量。es6 新增了let、const。
- 变量声明后，是空的，因为没有值。所以要赋值。

## 思考
- 所以，任何东西都是对象，无论是Number、null、undefined。只是我们将这个对象，以赋值的形式给了变量。那么，为什么Number、string、null没有prototype。

- JavaScript：The Definitive Guide

> JavaScript’s types can be divided into primitive types and object types. And they can be divided into types with methods and types without（我认为这里少了个单词 methods，但其实语法上也没问题）. They can also be categorized as mutable and immutable types. A value of a mutable type can change. Objects and arrays are mutable: a JavaScript program can change the values of object properties and array elements. Numbers, booleans, null, and undefined are immutable

- javascrip类型可以分为原始类型和引用类型。并且他们可以分为有方法的类型和没有方法的类型。它们都可以按可变和不可变来分类。一个可变的值可以更改。 Object和Array都是可变的：一个JavaScript程序能够改变对象的属性和数组元素。Number，boolean，null，以及 undefined 都是不可变的

- 所以我们可以这么理解
    - 我们只是var了一个变量，让它的值为某种类型的对象。当我们用typeof，还是Object.prototype.toString.call()去判断类型的时候，其实是判断变量上值的类型。而不是这个变量。
    - 当我们将一个原始类型复制给了一个变量，也就意味着这个变量的值可以变，因为是按值访问，所以可以修改变量中的实际值，但值的对象是固定且不可变的。
    - 所以，a.b 其实是要在a的对象上添加方法或属性，然后当a的对象为原始类型时，则不被允许，所以代码第二行没有报错，但也没有挂载上去。在第三行代码执行时，因为a没有b的属性，所以不可能去执行a.b()


## 后续的思考
JavaScript中的对象类型(Object types)实际上是引用类型。对象是引用类型的实例，如Array、Function等都是特殊类型的对象。例如:
``` js
// 定义一个person的引用类型
function person(name,sex){
	this.name=name;
	this.sex=sex;
}
var man = new person('李雷','man'); // 创建实例

```


## 那么为什么会有区别？

- 原始类型：存储在栈(stack)中，所以他们的值，存在变量的访问的位置
- 引用类型：存储在堆(heap)中,所以他们存在变量上的其实是个指针，指向存储对象的内存地址。
- 因为原始类型占据的空间小且固定。所以将他存在栈中，因为方便快速查询。而引用类型的大小不固定，放在栈中反而- 会降低变量查询效率。而如果在栈中存放的是个地址，那么地址大小就是固定的。
- 所以，引用类型的访问，其实就是先访问对象在栈中所存的堆地址，然后再根据这个地址去堆内存中获取这个对象的值。

## 原始类型和引用类型的赋值区别

当对引用类型进行赋值操作时，实际上是将引用复制给了新变量，两个变量指向堆内存中的同一个对象：

```js
var a= {c:1}; // a指向堆内存中包含c属性的对象
var b=a; // b现在也指向同一个堆内存对象
b.c = 2; // 修改了堆内存中对象的c属性值
console.log(a.c); // 2 - a也指向同一个对象，所以值也改变了

```

这种情况下，a和b保存的是指向同一对象的引用，因此修改其中一个变量引用的对象，另一个变量也会反映这个变化。

对于原始类型，赋值操作会创建值的副本，两个变量是完全独立的：

```js
var x=1; // x在栈中存储值1
var y=x; // 创建1的副本并存储在y中
console.log(y); // 1
x=2; // 修改x中的值为2，但y不受影响
console.log(y); // 1 - y仍然是值1

```

这种情况下，x和y各自在栈中存储独立的值，修改一个变量不会影响另一个变量。




## JavaScript原型链（补充）

原型链是JavaScript实现对象继承的机制：
- 构造函数通过`new`关键字创建实例对象
- 实例对象通过`__proto__`属性指向其原型对象
- 原型对象通过`constructor`属性指向对应的构造函数
- 构造函数通过`prototype`属性指向其原型对象
- 构造函数作为函数，其`__proto__`指向Function.prototype
- 原型对象通过`__proto__`向上查找，最终指向Object.prototype
- Object.prototype的`__proto__`为null，这是原型链的终点

```
构造函数 --> new --> 实例对象
实例对象--> __proto__ --> 原型对象
原型对象--> constructor --> 构造函数
构造函数 --> prototype --> 原型对象
构造函数 --> __proto__ --> Function.prototype
原型对象--> __proto__ --> Object.prototype
Object.prototype --> __proto__ --> null   // 原型链的终点是null
```