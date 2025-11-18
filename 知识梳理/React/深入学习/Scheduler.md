# Scheduler 源码分析


# 普通任务的调度

### 全局变量


```javascript

// Max 31 bit integer. The max integer size in V8 for 32-bit systems.
// Math.pow(2, 30) - 1
// 0b111111111111111111111111111111
var maxSigned31BitInt = 1073741823; // 这里取了31位有符号整数的最大值，意思是永远不会过期

// Times out immediately
var IMMEDIATE_PRIORITY_TIMEOUT = -1;
// Eventually times out
var USER_BLOCKING_PRIORITY_TIMEOUT = 250;
var NORMAL_PRIORITY_TIMEOUT = 5000;
var LOW_PRIORITY_TIMEOUT = 10000;
// Never times out
var IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt;

var taskQueue: Array<Task> = []; // 普通任务
var timerQueue: Array<Task> = []; // 延迟任务

var isHostTimeoutScheduled = false; // 是否有延迟任务正在调度

```



### schedulerCallback 

这个函数的主要目的就是调度任务

```javascript 


/**
 * 
 * @param priorityLevel 优先级登记
 * @param callback 回调
 * @param options 选项
 * @returns 
 */
function unstable_scheduleCallback(
  priorityLevel: PriorityLevel,
  callback: Callback,
  options?: { delay: number },
): Task {
  var currentTime = getCurrentTime();// performance.now()  // 获取当前时间

  // callback开始时间
  var startTime;
  // 判断是否设置delay，来修正startTime
  if (typeof options === 'object' && options !== null) {
    var delay = options.delay;
    if (typeof delay === 'number' && delay > 0) {
      startTime = currentTime + delay;
    } else {
      startTime = currentTime;
    }
  } else {
    startTime = currentTime;
  }

  var timeout;
  // 根据优先级等级，设置timeout
  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT; // -1
      break;
    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT; // 250
      break;
    case IdlePriority:
      //  maxSigned31BitInt = 1073741823;
      // IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt; 
      // 1073741823是31位有符号整数的最大值，所以用来表示空闲优先级的超时时间，意味着这些任务永远不会超时，只有在浏览器完全空闲时才会执行。
      timeout = IDLE_PRIORITY_TIMEOUT;
      break;
    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT; // 10000
      break;
    case NormalPriority:
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT; // 5000
      break;
  }

  // 开始时间+延迟时间， 就是过期时间
  var expirationTime = startTime + timeout;
  // 创建新任务
  var newTask: Task = {
    id: taskIdCounter++, // 任务id
    callback, // 任务具体要做的内容
    priorityLevel, // 任务优先级
    startTime, // 任务开始时间
    expirationTime, // 任务过期时间
    sortIndex: -1, // 用于小顶堆排序（一种算法，可以始终从任务队列中拿出最优先的任务），进行排序的索引
  };


  if (enableProfiling) {
    newTask.isQueued = false;
  }

  if (startTime > currentTime) {
    // This is a delayed task.
    // 开始时间大于当前时间，就是延迟任务

    newTask.sortIndex = startTime;
    // 将延迟任务推入到 timerQueue 队列
    push(timerQueue, newTask);
    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      // All tasks are delayed, and this is the task with the earliest delay.
      // 当 普通队列执行完毕，并且延迟队列还有任务，取出延迟队列的任务给当前的任务

      if (isHostTimeoutScheduled) { 
        // Cancel an existing timeout.
        cancelHostTimeout();
      } else {
        isHostTimeoutScheduled = true;
      }
      // Schedule a timeout.
      // 调度一个延迟任务
      requestHostTimeout(handleTimeout, startTime - currentTime);
    }
  } else {
    // 当前任务不是延迟任务， 把当前任务推入到普通任务队列
    newTask.sortIndex = expirationTime;
    push(taskQueue, newTask);
    if (enableProfiling) {
      markTaskStart(newTask, currentTime);
      newTask.isQueued = true;
    }
    // Schedule a host callback, if needed. If we're already performing work,
    // wait until the next time we yield.
    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      // 开始普通任务的调度
      requestHostCallback();
    }
  }
// 对外返回任务
  return newTask;
}



```
### 总结

需要注意几个关键点
1. 任务的调度，主要有两个队列，react内部用了小顶堆算法，进行任务的调度
   - taskQueue,存放普通任务，最终调用 **requestHostCallback(flushWork)**
   - timerQueue, 存放延迟任务，最终调用 **requestHostTimeout(handleTimeout, startTime - currentTime);**

2. 根据传入的PriorityLevel，来决定任务的优先级, 并进行timeout的设置。
   -  IMMEDIATE_PRIORITY_TIMEOUT <  currentTime < USER_BLOCKING_PRIORITY_TIMEOUT < NORMAL_PRIORITY_TIMEOUT < LOW_PRIORITY_TIMEOUT < IDLE_PRIORITY_TIMEOUT


## requestHostCallback 和 schedulePerformWorkUntilDeadline

```javascript
 


// 普通任务的调度执行，实际上是调用 schedulePerformWorkUntilDeadline
function requestHostCallback() {
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    schedulePerformWorkUntilDeadline();
  }
}



 
// schedulePerformWorkUntilDeadline 初始化是undefined，根据环境来决定用什么方法生成宏任务

// 就是setTimeOut
const localSetTimeout = typeof setTimeout === 'function' ? setTimeout : null;
const localSetImmediate =
  typeof setImmediate !== 'undefined' ? setImmediate : null; // IE and Node.js + jsdom

let schedulePerformWorkUntilDeadline;
if (typeof localSetImmediate === 'function') {
  // Node.js and old IE. 
  // https://github.com/facebook/react/issues/20756
   // node和老的IE，用的是 setImmediate
  schedulePerformWorkUntilDeadline = () => {
    localSetImmediate(performWorkUntilDeadline);
  };
} else if (typeof MessageChannel !== 'undefined') {
  // DOM and Worker environments.
  // We prefer MessageChannel because of the 4ms setTimeout clamping.
  const channel = new MessageChannel();
  const port = channel.port2;
  channel.port1.onmessage = performWorkUntilDeadline;
  // 大部分是用postMessage
  schedulePerformWorkUntilDeadline = () => {
    port.postMessage(null);
  };
} else {
  // We should only fallback here in non-browser environments.
  // 剩下的，就是用 setTimeOut进行兜底
  schedulePerformWorkUntilDeadline = () => {
    // $FlowFixMe[not-a-function] nullable value
    localSetTimeout(performWorkUntilDeadline, 0);
  };
} 



```

### 总结
1. requestHostCallback主要就是调用了 **schedulePerformWorkUntilDeadline**
2. schedulePerformWorkUntilDeadline 会根据宿主环境不同，而采用对应的宏任务方式，但大部分场景都是MessageChannel


## performWorkUntilDeadline

```javascript 

/**
 * 这个方法主要是根据条件，调用flushWork
 */
const performWorkUntilDeadline = () => {
  if (isMessageLoopRunning) {
    // 获取当前时间
    const currentTime = getCurrentTime(); 
    // 全局变量，默认值为-1
    // 用来测量任务的执行时间，从而能够知道主线程被阻塞了多久
    startTime = currentTime;  
    let hasMoreWork = true; // 还有需要做的任务
    try {
      // 如果是true，代表工作没做完
      // false，代表没有人任务
      hasMoreWork = flushWork(currentTime);
    } finally {
      if (hasMoreWork) {
        // If there's more work, schedule the next message event at the end
        // of the preceding one.
        // 如果还有任务，就调用 messageChannel 进行一个message 事件的调度，就将任务放入到任务队列里面
        schedulePerformWorkUntilDeadline();
      } else {
        // 如果做完，就将 isMessageLoopRunning 这个表示 是否有人物正在调度 的状态改为 false
        isMessageLoopRunning = false;
      }
    }
  }
  // Yielding to the browser will give it a chance to paint, so we can
  // reset this.
  needsPaint = false;
}; 

```

### 总结
- performWorkUntilDeadline 主要还是根据条件，调用flushWork，并返回一个Boole，来判断是否还有任务需要做，如果有，就继续调用schedulePerformWorkUntilDeadline，否则，就将 isMessageLoopRunning 这个表示 是否有任务正在调度 的状态改为 false



## flushWork && workLoop

```javascript 
/**
 * 
 * @param initialTime 执行当前任务时，开始执行的时间
 * @returns 
 */
function flushWork(initialTime: number) {
  if (enableProfiling) {
    markSchedulerUnsuspended(initialTime);
  }

  // We'll need a host callback the next time work is scheduled.
  isHostCallbackScheduled = false;
  if (isHostTimeoutScheduled) {
    // We scheduled a timeout but it's no longer needed. Cancel it.
    isHostTimeoutScheduled = false;
    cancelHostTimeout();
  }

  isPerformingWork = true;
  const previousPriorityLevel = currentPriorityLevel;
  try {
    if (enableProfiling) {
      try {
        // 该方法的核心，调用workLoop进行事件循环
        return workLoop(initialTime);
      } catch (error) {
        if (currentTask !== null) {
          const currentTime = getCurrentTime();
          // $FlowFixMe[incompatible-call] found when upgrading Flow
          markTaskErrored(currentTask, currentTime);
          // $FlowFixMe[incompatible-use] found when upgrading Flow
          currentTask.isQueued = false;
        }
        throw error;
      }
    } else {
      // No catch in prod code path.
      return workLoop(initialTime);
    }
  } finally {
    // 讲时间记录在 eventLog里
    currentTask = null;
    currentPriorityLevel = previousPriorityLevel;
    isPerformingWork = false;
    if (enableProfiling) {
      const currentTime = getCurrentTime();
      markSchedulerSuspended(currentTime);
    }
  }
}

/**
 * 
 * @param initialTime 当前任务开始执行的时间
 * @returns 
 */
function workLoop(initialTime: number) {
  let currentTime = initialTime;
  // 遍历timerQueue，判断是否有已经到期了的任务，如果有，将这个任务放入到taskQueue,以便于下一次继续执行，这个方法可以保证taskQueue中的任务，都是按照优先级和过期时间排序的。
  advanceTimers(currentTime);
  // 从taskqueue取一个任务出来
  currentTask = peek(taskQueue);
  while (
    // 如果当前的任务不为空
    currentTask !== null &&
    !(enableSchedulerDebugging && isSchedulerPaused)
  ) {
    // 如果当前任务的过期时间 > 当前时间，说明该任务还没有过期
        // shouldYieldToHost 判断是否应该暂停并归还主线程
        if (currentTask.expirationTime > currentTime && shouldYieldToHost()) {
      // This currentTask hasn't expired, and we've reached the deadline.
      break;
    }

    // 未进入上面的逻辑，说明任务已过期或有剩余时间执行
        const callback = currentTask.callback;
    if (typeof callback === 'function') {
      currentTask.callback = null;
      currentPriorityLevel = currentTask.priorityLevel;
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      // 信息收集，用于性能分析
      if (enableProfiling) {
        markTaskRun(currentTask, currentTime);
      }
      // 任务执行
      const continuationCallback = callback(didUserCallbackTimeout);
      currentTime = getCurrentTime();
      if (typeof continuationCallback === 'function') {
        // If a continuation is returned, immediately yield to the main thread
        // regardless of how much time is left in the current time slice.
        currentTask.callback = continuationCallback;
        if (enableProfiling) {
          markTaskYield(currentTask, currentTime);
        }
        advanceTimers(currentTime);
        return true;
      } else {
        if (enableProfiling) {
          // 标记当前任务完成，并触发对应的监听器
          markTaskCompleted(currentTask, currentTime);
          currentTask.isQueued = false;
        }
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue);
        }
        advanceTimers(currentTime);
      }
    } else {
      // 不是function，无法执行，则弹出任务
      pop(taskQueue);
    }
    // 再从taskQueue里拿出一个任务
    currentTask = peek(taskQueue);
  }


  // Return whether there's additional work
  if (currentTask !== null) {
        // 如果不为空，则代表还有任务，返回true给外部的hasMoreWork
        return true;
  } else {
    // 说明 taskQueue 普通任务队列为空，则从 timerQueue里获取 延迟 任务
    const firstTimer = peek(timerQueue);
    if (firstTimer !== null) {
      // 如果timerQueue有任务，则执行延迟队列的任务
      requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
    }
    return false;
  }
}



```

### 总结
- flushWork 主要是调用 workLoop
- workLoop 主要是遍历taskQueue，执行任务，如果任务执行完毕，就从taskQueue里面取出一个任务，继续执行，直到taskQueue为空，再从timerQueue里面取出一个任务，继续执行，直到timerQueue为空，就结束了。 




## shouldYieldToHost

这个方法主要用来判断是否要归还主线程，让浏览器进行更高优先级的任务。值得注意的是，虽然一帧约有16ms，但React内部默认以5ms作为时间切片单位进行循环检查。

```javascript

function shouldYieldToHost(): boolean {
  // getCurrentTime 这个是获取的当前的时间
  // startTime 全局变量，一开始是 -1， 之后任务开始时，将任务开始的时间赋值给它。

  const timeElapsed = getCurrentTime() - startTime;
  // frameInterval 默认是5ms， 是每个任务的时间切片，也就是每个任务最多可以连续执行多久。
  // 如果小于5ms，则没有超时
  if (timeElapsed < frameInterval) {
    // The main thread has only been blocked for a really short amount of time;
    // smaller than a single frame. Don't yield yet.
    // 主线程只被阻塞了很短的时间，比一帧还要段，还没有达到归还到主线程
    return false;
  }

  //  主线程被阻塞了一段时间，需要归还给主线程，让浏览器执行更高优先级的任务。
  if (enableIsInputPending) {
    if (needsPaint) {
      // There's a pending paint (signaled by `requestPaint`). Yield now.
      return true;
    }
    if (timeElapsed < continuousInputInterval) {
      // We haven't blocked the thread for that long. Only yield if there's a
      // pending discrete input (e.g. click). It's OK if there's pending
      // continuous input (e.g. mouseover).
      if (isInputPending !== null) {
        return isInputPending();
      }
    } else if (timeElapsed < maxInterval) {
      // Yield if there's either a pending discrete or continuous input.
      if (isInputPending !== null) {
        return isInputPending(continuousOptions);
      }
    } else {
      // We've blocked the thread for a long time. Even if there's no pending
      // input, there may be some other scheduled work that we don't know about,
      // like a network event. Yield now.
      return true;
    }
  }

  // `isInputPending` isn't available. Yield now.
  return true;
}





```

## advanceTimers



```javascript 

/**
 * 遍历timerQueue，将已经过期的任务，插入到taskQueue任务里
 * @param currentTime 
 * @returns 
 */
function advanceTimers(currentTime: number) {
//  从延迟任务队列，获取一个任务
  let timer = peek(timerQueue);
  while (timer !== null) {
    // 如果任务没有对应的callback，则直接弹出
    if (timer.callback === null) {
      // Timer was cancelled.
      pop(timerQueue);
    } else if (timer.startTime <= currentTime) {
      // 当前任务已经超过了它的预期执行时间，已经过期。需要立即执行，
      // 则需要将其弹出，然后push到taskQueue队列
      // Timer fired. Transfer to the task queue.
      pop(timerQueue);
      timer.sortIndex = timer.expirationTime;
      push(taskQueue, timer);
      // 收集信息
      if (enableProfiling) {
        markTaskStart(timer, currentTime);
        timer.isQueued = true;
      }
    } else {
      // Remaining timers are pending.
      return;
    }
    // 从timerQueue再获取一个任务进行遍历
      timer = peek(timerQueue);
  }
}
```



# 延迟任务的调度


## requestHostTimeout
对延迟任务的处理，实际上就是调用setTimeOut

```javascript

 /**
 * 
 * @param callback 传入的 handleTimeout
 * @param ms 就是delay 时间
 */
function requestHostTimeout(
  callback: (currentTime: number) => void,
  ms: number,
) {
  // 下面这个就是setTimeout
  taskTimeoutID = localSetTimeout(() => {
    callback(getCurrentTime());
  }, ms);
}


```

## handleTimeout
主要是将时间已经到了的延迟任务，放入普通任务队列中，然后，使用requestHostCallback 进行任务调度


``` jsx
/**
 * 
 * @param currentTime 当前时间
 */
function handleTimeout(currentTime: number) {
    // 将是否有延迟任务正在调度的标志位设置为false
    isHostTimeoutScheduled = false;
    // 遍历 timerQueue，找出所有已经到期的任务
    advanceTimers(currentTime);
  
    if (!isHostCallbackScheduled) {
        // 检查普通任务队列是否有任务
      if (peek(taskQueue) !== null) {

        isHostCallbackScheduled = true;
        // 采用普通任务的调度方式调度
        requestHostCallback();
      } else {
        // 普通任务队列没有任务，检查延迟任务队列
        const firstTimer = peek(timerQueue);
        if (firstTimer !== null) {
            // 如果有任务，就采用延迟任务的调度方式调度
          requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
        }
      }
    }
  }

```


两队列，分先后：timerQueue（预约架）、taskQueue（待做架）；
三函数，控节奏：advanceTimers（查预约）、shouldYield（控休息）、performWork（真执行）；
一闹钟，保不漏：schedulePerform（设提醒，下次继续干）；
核心是，不卡 UI：时间切片 + 优先级，用户操作不等待！