# Message Channel

## 事件循环
事件循环的机制就是每循环一次，会从任务队列中取出一个任务来执行，如果还没有达到浏览器需要重新渲染的时间(16ms),那么久继续循环一次，从任务队列里面再取一个任务来执行，以此类推，直到浏览器需要重新渲染，这个时候就会执行重新渲染的任务，执行完毕后，回到之前的流程。

> 需要注意的是 requestAnimationFrame API是在每次重新 渲染之前执行的。这个API的出现，就是专门用来做动画的。


## MessageChannel接口

这其实是一个用来做消息通讯的接口，用来进行跨线程通讯，也就是说可以在不同的线程之间传递数据。

```html
<div>
  <input type="text" id="content" placeholder="请输入消息">
</div>
<div>
  <button id="btn1">给 port1 发消息</button>
  <button id="btn2">给 port2 发消息</button>
</div>

```

```jsx
const channel = new MessageChannel();
// 两个信息端口，这两个信息端口可以进行信息的通信
const port1 = channel.port1;
const port2 = channel.port2;
btn1.onclick = function(){
  // 给 port1 发消息
  // 那么这个信息就应该由 port2 来进行发送
  port2.postMessage(content.value);
}
// port1 需要监听发送给自己的消息
port1.onmessage = function(event){
  console.log(`port1 收到了来自 port2 的消息：${event.data}`);
}

btn2.onclick = function(){
  // 给 port2 发消息
  // 那么这个信息就应该由 port1 来进行发送
  port1.postMessage(content.value);
}
// port2 需要监听发送给自己的消息
port2.onmessage = function(event){
  console.log(`port2 收到了来自 port1 的消息：${event.data}`);
}

```

## Scheduler
任务调度需要满足两个条件：
1. JS暂停，将主线程还给浏览器，让浏览器能够有序的重新渲染页面
2. 暂停了的JS（也就是还有任务没有执行完），需要再下一次接着来执行
   1. 浏览器内部有机制来估计每一帧的剩余时间，从而来决定是否调用 requestIdleCallback，如果callback执行时间过长，那么就会获取option里的timeout，强制执行callback。如果没有timeout，那么浏览器会等待下一个空暇你时间来执行callback，将当前js暂停。

根据上面的描述，就是利用事件循环，将没有执行完的js放入到任务队列，下一次事件循环的时候再取出执行。所以就需要产生一个任务（宏任务）

> 为什么不适用setTimeOut？
> 因为setTimeOut 在嵌套超过5层，timeout如果小于4ms，会强制为4ms
> 本来一帧就只有16ms， 这就少了1/4

```
let count = 0; // 计数器
let startTime = new Date(); // 获取当前的时间戳
console.log("start time:", 0, 0);
function fn(){
  setTimeout(function(){
    console.log("exec time:", ++count, new Date() - startTime);
    if(count === 50){
      return;
    }
    fn();
  },0)
}
fn();

```


> 为什么不选择 requestAnimationFrame？
> 1. 因为这个只能在重新渲染之前，才能够执行一次。如果把它包装成一个任务，放到任务队列中。只要没到重新渲染的时间，就可以一直从任务队列里面获取任务执行。
> 2. 兼容问题


> 为什么没有选择包装成一个微任务？
> 因为微任务会在清空整个队列后，才会结束。所以在页面更新前会一直执行，直到队列被清空。 （微任务优先级最高）
