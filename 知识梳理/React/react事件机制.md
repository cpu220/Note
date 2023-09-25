

# react事件绑定

* 事件绑定通过 jsx方式绑定的事件，react自己实现了一套事件系统来实现，而不是直接使用原声的addEventListener 。

* 主要是基于委托（delegation），也就是说，会在顶层的元素上添加一个监听器，然后根据事件的冒泡，来判断具体是哪个元素触发了事件，并执行相应的回调函数。

* 这样做的好处，是减少内存消耗，提高性能，以及方便管理事件监听器的生命周期。

* 此外，react还模拟了一些浏览器不支持或者不一致的事件，比如 onInput，onWhell，onScroll等，并且提供了一些额外的功能，比如合成事件（SyntheticEvent），事件池（event pool）,自定义事件等。
    * 这里需要注意的是，从0.14开始，react返回false，不在组织事件冒泡，而是要手动调用
        *  e.stopPropagation() 或 e.preventDefault()
    

# 事件注册机制
通过事件委托的方式，将所有事件都绑定在了document来进行统一处理

1. 组件挂在阶段
2. reactDOM.render()
3. 调用 react.createElement
4. 得到虚拟DOM树
5. 处理组件props是否是事件
6. 得到事件类型和回调函数
7. document 上注册对应的事件
8. 存储时间回到listernerBank中

由于合成事件是事件委托的一种实现，助于奥是利用事件冒泡机制将所有事件在document进行统一处理，所以，原生时间阻止了冒泡，那么合成事件无法执行。


# useTransition
在组件状态更新时，延迟出发一些低优先级的渲染。
useTransition 返回一个布尔值和一个函数
    * 布尔值表示处于延迟状态
    * 函数可以接受一个回调，在回调中执行状态更新
useTransition 还可以设置一个timeoutMs参数，表示最长的延迟时间，如果超过这个时间，就会强制更新。
    * timeoutMs默认值为5000ms

useTransition 的目的不是为了节省渲染次数，而是为了提高渲染质量。它可以让状态更新，有限渲染一些对用户体验更重要的内容。

# useDeferredValue
将某个值的更新，推迟到更合适的时机，从而避免在高优先级任务执行期间进行不必要的渲染。 
useDeFerredValue接受一个值作为参数，返回一个延迟响应的值。 也可以设置一个timeoutMs参数，表示最长的延迟时间。

useDeferredValue是延迟更新

```js
const deferredCount = useDeferredValue(count, { timeoutMs: 2000 }); // 设置延迟响应时间
// 如果2000ms内一直在疯狂的点击，那么2000后会强制更新
// 1. 2000ms内停止，取最后一次
// 2. 2000ms内一直在疯狂的点击，那么2000后会强制更新，取这一刻的值
const backgroundColor = getColor(deferredCount);

```
