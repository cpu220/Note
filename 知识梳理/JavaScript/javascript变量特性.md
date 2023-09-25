# javacript's immutable

## javaScript 的类型

- 在不考虑es6、es7的情况下，js常规拥有：Undefined、null、Boolean、String、Number、Object、Function等。
- 然后我们又习惯用. 结构符来将一些属性、方法挂载到对象上。毕竟对JavaScript来说，任何东西都是Object。只是type不同。
- 那么问题来了，为什么 String、null、Undefined、Number会报错

```js

var a=1; // Undefined
a.b=function(){alert(123);} // function (){alert(123)}
a.b(); // Uncaught TypeError: b.a is not a function
Object.prototype.toString.call(a) // "[object Number]"
Object.prototype.toString.call(a.b) // "[object Undefined]"
a.hasOwnProperty('b') // false

```

为什么？


## JavaScript对象
JavaScript来说，任何东西都是对象。对象拥有属性和方法。

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
其实object types 我一开始是翻译为对象类型。但其实对象其实是引用类型的实例。比如:
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

## 那么2个赋值又有什么区别？

```js
var a= {c:1}; // undefined
var b=a; // undefined
b.c = 2; //2
a.c; // 2

```

从上面这个代码上可以看出来，引用类型其实是，a将变量在栈中保存的地址给了b。所以修改变量b，就是修改了b对应在堆内存中的值，然而栈内存中的地址没有变，所以当a再去访问c的时候，a.c的值却和b.c 一样。

```js

var x=1; // undefined
var y=x; // undefined
y;// 1
x=2;// 2
y;// 1

```

面这段代码可以看出来，原始类型其实是将变量中保存在栈中的值，复制给了y，x和y是完全独立的，仅有的关系也就是值一样。