# state

## state是异步的
在react的组件生命周期中 setState是异步的，所以无法直接获取到state更新后的值，可以用setState第二个参数获取。

* 但是，在setTimeOut 和setInterval中，setState是同步的，所以可以直接获取到state更新后的值。
    * 因为涉及到微任务和宏任务
    * 在react中，setState是异步的，所以会先执行完所有的同步代码，然后再执行setState，所以在setTimeout中，setState是同步的。
    * 其实就是将更新请求放入一个队列中，等到合适的时机再批量执行。这样的目的是为了提高性能，避免频繁地重新渲染组件。
    * 所以，当放入到 setTimeOut 和setInterval ，其实是延迟队列中调用了一个异步方法。


* react的setState 会根据 isBatchingUpdates 判断是直接更新，还是放入队列中
* isBatchingUpdates默认值是false，当react在执行生命周期或调用事件处理函数之前，会将其设置为true，当生命周期或事件处理函数执行完毕后，会将其设置为false，所以在生命周期和事件处理函数中，setState是同步的，而在setTimeout和setInterval中，setState是异步的。


## 为什么要设计成异步
为了保证和props的一致性

* 因为props必然是异步，只有props变更，才会触发render，所以为了保证state和props的一致性，state也必须是异步的。

2. 为了提高性能，避免频繁地重新渲染组件。