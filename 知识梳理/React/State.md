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

# 源码

> packages/react/src/ReactBaseClasses.js


```ts
Component.prototype.setState = function(partialState, callback) {
  if (
    typeof partialState !== 'object' &&
    typeof partialState !== 'function' &&
    partialState != null
  ) {
    throw new Error(
      'setState(...): takes an object of state variables to update or a ' +
        'function which returns an object of state variables.',
    );
  }

  this.updater.enqueueSetState(this, partialState, callback, 'setState');
};

```
从上面的源码可以看到， setState最终调用的是enqueueSetState方法，并且有setState只暴露的两个参数，一个要修改的状态，一个回调函数callback。

核心是将一个setState任务放入了队列中


> packages/react-dom/src/server/ReactPartialRenderer.js

```ts
  const updater = {
      isMounted: function(publicInstance) {
        return false;
      },
      enqueueForceUpdate: function(publicInstance) {
        if (queue === null) {
          warnNoop(publicInstance, 'forceUpdate');
          return null;
        }
      },
      enqueueReplaceState: function(publicInstance, completeState) {
        replace = true;
        queue = [completeState];
      },
      enqueueSetState: function(publicInstance, currentPartialState) {
        if (queue === null) {
          warnNoop(publicInstance, 'setState');
          return null;
        }
        queue.push(currentPartialState);
      },
    };

```
从这段源码可以看出，队列有多个状态方法，都是对于 queue 的操作


```ts

if (queue.length) {
    // 当前的queue 复制给了 oldQueue
    const oldQueue = queue;
    const oldReplace = replace;
    // 重置 queue
    queue = null;
    replace = false;

    if (oldReplace && oldQueue.length === 1) {
        inst.state = oldQueue[0];
    } else {
        let nextState = oldReplace ? oldQueue[0] : inst.state;
        let dontMutate = true;
        for (let i = oldReplace ? 1 : 0; i < oldQueue.length; i++) {
        const partial = oldQueue[i];
        const partialState =
            typeof partial === 'function'
            ? partial.call(inst, nextState, element.props, publicContext)
            : partial;
            //  这里可以看到，react是在这里将state进行了合并
        if (partialState != null) {
            if (dontMutate) {
            dontMutate = false;
            nextState = assign({}, nextState, partialState);
            } else {
                
            assign(nextState, partialState);
            }
        }
        }
        inst.state = nextState;
    }
} else {
    queue = null;
}
//  当合并结束，就会触发 render
 child = inst.render();
```

所以，本质上setState 受React管控，是会异步将更新任务进行合并，然后统一出发Render更新。但要是放在一个react无法管控的setTimeOut这类异步任务重，就会直接出发更新，因为React也无法确定延迟任务队列里哪些要进行合并。