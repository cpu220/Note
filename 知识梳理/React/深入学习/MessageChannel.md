# Message Channel

## 事件循环
事件循环是浏览器和Node.js处理异步操作的机制。它的工作原理是：
1. 从宏任务队列中取出一个任务执行
2. 执行过程中如果产生新的宏任务，会被加入到宏任务队列的末尾
3. 执行过程中如果产生新的微任务，会被加入到微任务队列的末尾
4. 当前任务执行完成后，立即处理微任务队列中的所有微任务
5. 微任务处理完成后，如果需要重新渲染（通常每16ms一次），会执行重新渲染
6. 渲染完成后，进入下一次事件循环，重复上述过程

> 需要注意的是 `requestAnimationFrame` API是在每次重新渲染之前执行的，专门用于创建流畅的动画效果。


## MessageChannel接口

`MessageChannel` 是一个用于消息通信的API，主要用于跨线程通信（如主线程与Web Worker之间）。它创建了两个相互关联的端口（port1和port2），通过这两个端口可以双向传递消息。

```html
<div>
  <input type="text" id="content" placeholder="请输入消息">
</div>
<div>
  <button id="btn1">给 port1 发消息</button>
  <button id="btn2">给 port2 发消息</button>
</div>

```

```javascript
// 获取DOM元素
const btn1 = document.getElementById('btn1');
const btn2 = document.getElementById('btn2');
const content = document.getElementById('content');

const channel = new MessageChannel();
// 两个相互关联的信息端口
const port1 = channel.port1;
const port2 = channel.port2;

btn1.onclick = function(){
  // 通过 port2 给 port1 发消息
  port2.postMessage(content.value);
}

// port1 监听来自 port2 的消息
port1.onmessage = function(event){
  console.log(`port1 收到了来自 port2 的消息：${event.data}`);
}

btn2.onclick = function(){
  // 通过 port1 给 port2 发消息
  port1.postMessage(content.value);
}

// port2 监听来自 port1 的消息
port2.onmessage = function(event){
  console.log(`port2 收到了来自 port1 的消息：${event.data}`);
}

```

## Scheduler
在React中，Scheduler（调度器）用于管理任务的执行顺序和时机，以确保应用的流畅性。任务调度需要满足两个核心条件：
1. 能够暂停当前JS执行，将主线程还给浏览器进行重新渲染
2. 暂停的任务能够在浏览器渲染完成后继续执行

为了实现这个目标，需要产生一个宏任务并将其加入任务队列，等待下一次事件循环时执行。

### 为什么不使用setTimeout？
- `setTimeout` 存在最小延迟限制：当嵌套超过5层且timeout小于4ms时，会被强制设置为4ms
- 这会导致任务执行延迟，影响应用的响应性

```javascript
let count = 0;
let startTime = new Date();
console.log("start time:", 0, 0);

function fn(){
  setTimeout(function(){
    console.log("exec time:", ++count, new Date() - startTime);
    if(count === 50) return;
    fn();
  }, 0);
}

fn();
```

### 为什么不选择requestAnimationFrame？
- `requestAnimationFrame` 只能在重新渲染之前执行一次，无法在同一帧内执行多个任务
- 兼容性不如MessageChannel广泛

### 为什么不选择微任务？
- 微任务会在当前执行栈清空后立即执行，直到整个微任务队列被清空
- 这会导致长时间占据主线程，延迟浏览器的重新渲染

### 为什么选择MessageChannel？
- `MessageChannel` 可以创建两个通信端口，通过端口发送消息会产生一个宏任务
- 这个宏任务的执行时机比`setTimeout`更精确，没有4ms的最小延迟限制
- 可以更高效地利用每一帧的剩余时间，提高应用的响应性

React的Scheduler就是利用`MessageChannel`来实现任务的精细调度，确保应用在保持高性能的同时，能够及时响应用户交互。
