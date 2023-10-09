# React知识梳理

# 一、整体架构

React在v15以前的架构，被称之为stack架构。由于在虚拟DOM树的对比中，采用的是递归，计算会消耗大量的时间，而且递归是无法被打断的。
所以从v16开始，重新调整了整体的架构，新的架构被称之为Fiber架构，而新的架构相比旧的架构，有一个最大的特点，就是可以进行时间切片。

## 旧架构的问题

在Javascript构建 **快速响应** 的大型web应用程序的过程中，实际上有两大场景的限制

1. 当需要执行大量计算，或者设备本身性能不足的时候，页面就会出现掉帧、卡顿。这个本质上是cpu的瓶颈问题
   - 所以随着设备性能的提升，以往很多性能优化的技巧，现在都变得不那么的重要。
2. 当进行IO操作的时候，需要等待数据返回，再进行后续的操作。这个等待的过程中，无法**快速响应**，这个实际上就是来自I/O的瓶颈。

所以，无论是cpu的瓶颈，还是I/O的瓶颈，都会导致页面无法快速响应，从而导致页面卡顿的现象。为了解决这个问题，那么 time slice（时间切片）就是一个很好的解决方案。

## 新架构的解决思路

> 这里需要明确一个问题， 虚拟DOM，只是一个概念，并不是具体的一种技术。所以新旧两个框架，都是用不同的技术手段来实现这个概念。

### 解决CPU瓶颈

在React16开始，官方引入了Fiber的概念，这是一种利用链表结构来描述UI的方式，本质上也是一种虚拟DOM的实现。

Fiber本质上也是一个对象，但和之前不同的是，Fiber使用的是链表的结构进行串联。这样的好处是，在进行整颗树对比（Reconciler）计算时，这个过程是可以被打断的。（对比旧框架的递归）

当发现一帧（16ms）时间已经不够，不能够再继续执行JS，需要渲染下一帧的时候，这个时候就会打断JS的执行，渲染下一帧。渲染完成后，再接着回来完成上一次没有执行完的计算。


### 解决I/O瓶颈
在React V16这个版本中，引入了Scheduler（调度器），用来调度任务的优先级。在**wookloop**中，每次都会调用 **shouldYield** 来判断当前是否有足够的剩余时间，如果不够，就暂停 Reconciler的执行，将**主线程**还给**渲染线程**，进行下一帧的渲染操作。

当渲染工作结束后，再等待下一个宏任务进行后续的代码执行。这样就可以保证在有限的时间内，尽可能多的执行任务，从而提升整体的性能。

---

# 二、渲染流程

## 基本概念

现代的前端框架，都可以总结为一个公式
> UI = f (state)

基于这个公式，还可以继续拆分
1. 根据自变量 state的变化，来计算 UI 对应的变化
2. 根据宿主环境的不同，执行对应的API进行渲染

那么，放在React里，这个公式就可以变为

```js

const state = reconciler(update); // 计算出最新的状态
const UI = commit(state); // 根据上一步计算出的state，来渲染UI

```

所以React里，对应这两个公式，就有了下面的两个阶段：

1. Render阶段，根据虚拟DOM，计算出要 **最终** 渲染的虚拟DOM
   - Scheduler : 调度器
   - Reconciler ： 协调器
2. commit阶段： 根据上一步计算出来的虚拟DOM，渲染**具体的**UI
   - Renderer： 渲染器


## 流程总结
> 用户点击了按钮，首先Scheduler进行任务协调


```jsx
export default ()=>{
    const [count ,updateCount] = useState(0)
    return (
        <ul>
            <button onClick={ ()=> updateCount(count+1)  }>乘以{count}</button>
            <li>{1*count}</li>
            <li>{2*count}</li>
            <li>{3*count}</li>
        </ul>
    )
}

```

从上面的代码可以看出，当用户点击按钮后，触发了页面内容的更新。这个更新的过程，就是React的渲染流程。具体如下：


1. 用户点击了按钮，触发了 **updateCount** 
   - React进入Render阶段，这一阶段是在内存中执行的，不会更新宿主环境的UI，因此这个阶段的工作是可以被打断，用户也不会因为反复的背打断看到不完整的UI。
2. Scheduler接收到更新，开始调度，将 **count + 1** 交给了 Reconciler进行计算。
3. Reconciler 接受到更新，计算更新造成的影响。
   1. li-> 0 变为 li->1
   2. li-> 0 变为 li->2
   3. li-> 0 变为 li->3
   4. 将计算结果交给renderer， 进入到commit阶段
4. Renerer
   1. 根据标记，执行更新DOM的操作，这部分的工作，主要是同步的，也就是不能中断。

这样的流程，就可以最大程度的保证页面的流畅性。而为了能实现这个设计，新增加了Scheduler，引入了Fiber的概念，以及新的Reconciler的实现。


## 总结

整个React的工作流程，基本如下

- Render阶段
  - Scheduler
  - Reconciler
- Commit阶段
  - BeforeMutation (变动前)
    - commitBeforeMutaionEffects
    - commitBeforeMutationEffects_begin
    - commitBeforeMutationEffects_complete
  - Mutation （变动）
    - commitMutationEffects
    - commitMutationEffects_begin
    - commitMutationEffects_complete
  - FiberTree 交换 （双缓冲）
  - Layout
    - commitLayoutEffects
    - commitLayoutEffects_begin
    - commitLayoutEffects_complete
 
---

# 三、Fiber

Fiber它既是一种架构，也是一种数据类型，还是一种动态的工作单元。


## Fiber是一种架构

在 React 16 之前，使用的是 Stack Reconciler，也就是栈解调器。由于递归过程无法被打断，所以在进行大量的计算时，就会造成卡顿的现象。而这一问题，在React 16这一版本，新引入的Fiber的概念。得到了解决。 于是， stack Reconciler 就变成了 Fiber Reconciler

用一种数据类型的结构方式，描述所有DOM节点，以及他们之间的关系和状态，然后通过链表将他们串联在一起，形成FiberTree。

## Fiber是一种数据类型
本质上Fiber就是一个对象，是在React元素的基础上的一种升级版本。

```jsx
this.tag = tag;// 用来表示FiberNode的类型，可以是HostComponent、ClassComponent、FunctionCOmponent
this.key = key;// 唯一标识
this.elementType = null;
this.type = null; // FiberNode对应的组件类型，可以是字符串、原生组件、或函数
this.stateNode = null;  // 映射真实DOM

```


基于深度优先原则，在每次更新的过程中，从HostRootFiber开始， 先向下遍历到每一个FiberNode， 执行beginWork方法，根据传入的FiberNode，创建下一级的FiberNode。 这个过程被称之为 **递**
    - 如果当前的FiberNode是一个函数组件，那么beginWork会调用这个函数，然后创建对应的FiberNode节点。
    - 这一阶段，就是Reconciler的工作

当遍历到最后一个FiberNode的时候，就会开始向上遍历，执行completeWork方法，根据每一个FiberNode的状态，来决定是否要执行对应的副作用。 这个过程称之为 **归**

> 需要注意的是，React 是通过对旧的FiberTree遍历，加上新传入的props，来创建新的FiberTree。这个过程被称之为 **Diff**

## Fiber是一种动态的工作单元

在每一个FiberNode中，都保存了本次更新中，该元素变化的数据，还有要执行的工作。这些工作被称之为 **副作用**。 在Reconciler阶段，会**收集** 和  **标记** 这些副作用。在Commit阶段，才会根据这些**副作用**，执行对应的工作。

比如 effect，就是在commit阶段执行，并且是异步。


## Fiber 的双缓冲
在Fiber的架构中，引入了双缓冲的概念。

这个概念类似于显卡，分为前缓冲区，和后缓冲区。一个用于显示，一个用于渲染的计算。当完成后，就会交换两个缓冲区的内容。

这种技术就被称之为双缓冲技术。

所以，在Fiber的架构中，有两颗FiberTree，分别被称之为current FiberTree（真实UI对应的内容） 和 workInProgress FiberTree（内存中构建下一次要显示的内容）

```js
// 对应的源码如下
current.alternate = workInProgress
workInProgress.alternate = current

```

## 总结

Fiber这种新引入进来的概念，
1. 可以暂停、继续、或者取消渲染工作，根据新的**更新**来**调整**任务的优先级
2. 可以复用已完成的工作，或者丢弃不需要的工作 （在Diff中进行，具体是2次遍历）
3. 可以为不同类型的更新任务，分配不同的优先级
4. 提供了新的并发机制（concurrency primitives）

---





# 四、Diff
Rect在Reconciler阶段，为了能够尽量减少DOM的创建，所以会对新旧DOM进行Diff对比，找出哪些节点需要更新、复用和删除这些差异性。

> 注意一点，这里的新旧树对比，并不是Commit阶段的两颗树，
> 这里的Diff，是指 **current FiberNode** 和 **jsx对象数组**之间进行对比，然后生成新的 **WorkInProgress FiberNode**

> 如果是更新阶段，那么 current FiberNode 指的就是双缓冲中，存在于内存中的Fiber Tree。 而jsx对象数组，并不是一个Fiber Tree,而是通过 **React.createElement** 生成的**新**的JSX对象数组，用来描述组件的**结构**和**属性**。



由于Diff的过程，是要完整的对比两棵树，为了能够提高效率，React只会对同一层级的元素进行对比，而不会跨层级对比，这样就可以将复杂度从O(n^3)降低到O(n)

按场景划分，对比可以分为单节点对比，和多节点对比。但总的来说，就是先对比key，再对比type。
   - 如果更新前后没有设置key，那么key就是null，则被认为key相同
   - 如果key相同，type也相同，则继续向下遍历
   - 如果下面没有了，就会进行同级比较，如果兄弟节点也没有，则返回到父节点，然后对比父节点的兄弟节点，依次类推。这就是深度遍历

## 遍历

React 的对比，会进行两轮遍历

首先，对React的旧树（也就是上一次渲染中，workInProgress FIberNode）与JSX对象数组， 进行key、type对比，当对比到**不同**的节点，会将旧的FiberTree 剩下的FiberNode放入到一个map里面。

然后再对剩下的JSX对象数组进行遍历，如果从map中能找到可以**复用**的FiberNode节点，就拿来复用，如果找不到，就**新增**。

最后，当整个JSX对象数组遍历完，map里还有剩余的Fiber节点，就说明这些FiberNode是无法复用，直接放入deletions数组里面，后面统一删除。（在commit阶段）


## 双端对比算法
VUE采用的对比算法。

在整个对比过程中，新旧子节点的数组中，各有两个指针，分别指向头尾，然后依次向中间靠拢，进行比较。

为什么React没有采用，官方说法是因为没有反向指针，况且也觉得节点交换的情况很少，所以暂时还是用暴力的方法进行diff对比。


---

# 五、Scheduler  调度器

React里主要有两类任务调用，taskQueue（普通任务） 和 timerQueue（延迟任务），在React内部使用了小顶堆算法，进行任务调度（堆顶一定是最小的，所以每次都取数组的第一个）

这里需要注意的是，React团队计划将Scheduler单独发包，考虑到通用性，Scheduler和React内部的优先级是不一致的。


在React内部，采用了小顶堆算法，进行任务调度。

**schedulerCallback** 就是React内部任务调度的函数。而对于两个队列来说
- taskQueue，最终调用的是 RequestHostCallback(flushWork)
- timerQueue,最终调用的是 RequestHostTimeout(handleTimeout,startTimeout-currentTime)
  - 延迟队列的这个调用方法，其实就是setTimeOut
  - handleTimeout 方法，就是将已经过期延迟任务，放入到taskQueue中，然后使用  **requestHostCallback** 进行调度



## 流程
 
需要注意的是，RequestHostCallback内部，实际上调用的是 schedulePerformWorkUntilDeadline
 
**schedulePerformWorkUntilDeadline** 的初始化是undefined，是根据当前环境来决定用什么方法升成宏任务
- nodejs 或 IE， 则使用 localSetImmediate
- 大部分情况，则使用MessageChannel，用postMessage进行
- 剩下的，则走了 localSetTimeout，这个方法实际上就是setTimeOut
  
无论是这三个哪一个，最终都是执行 performWorkUntilDeadline 方法，该方法的作用就是根据条件，调用  **flushWork**，并返回一个Boole，来判断是否有任务需要做，如果有，就继续调用 **performWorkUntilDeadline** 直到没有任务为止。

flushWork 就是执行当前的任务，调用 workloop
workloop 则遍历taskQueue，执行取出的任务。直到taskQueue为空，再从timerQueue中取任务，最后结束。

这里需要注意的事 workloop，内部会根据 advanceTimers 、shouldYieldToHost 来对当前进行的任务进行优先级调整。
    - 比如，如果timerQueue中有任务过期，则将任务插入到taskQueue中。


所以顺序是：

RequestHostTimeout -> setTimeOut -> handleTimeout -> requestHostCallback -> schedulePerformWorkUntilDeadline-> performWorkUntilDeadline -> flushWork -> workLoop ->advanceTimers && shouldYieldToHost


总结：
1. 先根据优先级算法，排列优先级
2. 再进行任务调度，根据不同的宿主环境，执行对应的微任务
3. 在执行的过程中，会动态根据情况调整正在进行任务的优先级
4. 直到任务全部完成




---

# 六、Lane

React 在17的版本，开始引入lane来代替expirationTime，原因是因为，React团队打算独立发布Scheduler，所以就引入Lane

而React内部，有一个力度更细的优先级算法，就是 **Lane模型** 有**4种**优先级

 Scheduler 内部有**5种**优先级
```jsx
// 这里取了31位有符号整数的最大值，意思是永远不会过期
var maxSigned31BitInt = 1073741823; 
var IMMEDIATE_PRIORITY_TIMEOUT = -1;
// Eventually times out
var USER_BLOCKING_PRIORITY_TIMEOUT = 250;
var NORMAL_PRIORITY_TIMEOUT = 5000;
var LOW_PRIORITY_TIMEOUT = 10000;
// Never times out
var IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt; 

```




从代码中可以看到，不同的 **交互事件**，回调中产生的update会有不同的优先级，因此，在React内部的优先级也被称之为 EventPriority

```jsx

//
switch (schedulerPriority) {
    case ImmediateSchedulerPriority: // -1
        return DiscreteEventPriority; // Discrete 离散事件：click、focus、blur等
    case UserBlockingSchedulerPriority: // 250
        return ContinuousEventPriority; // Continuous 连续事件：drag、mouseMove、scroll、touchMove等
    case NormalSchedulerPriority: // 5000
    case LowSchedulerPriority:// 10000 
        return DefaultEventPriority; // Default 默认事件：通过计时器等周期性出发的更新，不属于交互产生的update 。轮播
    case IdleSchedulerPriority:
        return IdleEventPriority; // Idle 对应空闲情况的优先级
    default:
        return DefaultEventPriority; // Default 
}
```

顺序就是： Lane -> EventPriority -> SchedulerPriority

## expirationTime
在react在16版本的时候，采用的是expirationTime，这个和Scheduler里面的设计是一致的。不同的优先级采用不同的timeout

让React放弃的原因是，expirationTime耦合了**优先级**和 **批** 的概念。也就是在划分优先级的时候，因为 默认了 priorityOfBatch，导致了当前的update任务，只要大于等于 priorityOfBatch，就会被划分到同一批，没有办法将某一范围的几个优先级化为同一批。

因此，React引入了Lane模型，采用32 bit integer 的二进制来表示优先级，越低则优先级越高。

```jsx
export const NoLane: Lane = 0b0000000000000000000000000000000;
export const SyncLane: Lane = 0b0000000000000000000000000000001;
export const InputContinuousHydrationLane: Lane = 0b0000000000000000000000000000010;
```

这样，对于**批**的概念，也可以使用位运算来进行。这样就达到了动态划分**批** 的目的。 


---


# 七、渲染器

当计算完FiberNode，也就是Reconciler的工作结束后，就会进入下一个阶段，也就是 Renderer工作的阶段，（渲染器），也被称之为commit阶段（因为源码里的前缀是commit）。

这一阶段会将各种副作用commit到宿主环境的UI中。相较于前面在内存中运行的**Render**阶段不同。**Commit**阶段一旦开始，就会执行 **同步** 的操作，直到渲染结束，都无法被打断。 （不然会让用户看到不完整的UI）

这一阶段可以分为三个子阶段:
1. BeforeMutaion阶段 
2. Mutation阶段
3. Layout阶段

> 每个阶段都有 commitXXXEffect、commitXXX_begin、commitXXX_complete 三个方法，分别对应三个子阶段。都是对EffectList链表进行处理
>   - BeforeMutation ： 执行getSnapshotBeforeUpdate
>   - Mutation: 执行DOM的增删改
>   - Layout: 执行useLayoutEffect、componentDidMount、componentDidUpdate等


> EffectList链表，是一个单向循环链表，他的头部和尾部都是finishedWork节点。


值得注意是，在 Mutation 和 Layout之间，就会进行双缓冲的切换。



## commitXXXEffects
这个函数是每个子阶段的入口函数

```jsx
function commitXXXEffects(Root, firstChild){
    // 省略标记全局变量
    nextEffect = firstChild;
    // 省略重置全局变量
    commitXXXEffects_begin();
}

```

## commitXXXEffects_begin
这个函数的作用，是遍历EffectList,从链表的头部开始遍历，找到目标FiberNode，执行 commitXXXEffects_complete
1. 当前FiberNode的子FiberNode不包含该子阶段对应的flags
2. 当前的FiberNode不存在子FiberNode，也就是到链表的尾节点。

> flags 是React用来标记FiberNode 的一种属性，表示该FiberNode 在本次更新中有什么样的副作用。
> - Placement： 该FiberNode 需要被插入到DOM中
> - Update: 该FiberNode属性需要被更新
> - Deletion：该FiberNode 需要被删除。  



## commitXXXEffects_complete
这个方法主要是针对flags做具体的操作, 从EffectList链表的尾部开始遍历
1. 对当前FiberNode执行对应的操作，也就是 **commitXXXOnFiber(fiber)**
2. 如果存在兄弟级（sibling），那就将sibling =》 nextEffect，下一次执行 commitXXXOnFiber
3. 如果当前FiberNode没有兄弟级，则将父级作为nextEffect，下一次执行 commitXXXOnFiber

```jsx

function commitBeforeMutationEffects_complete() {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    try {
        // 所以主要是执行这个函数
      commitBeforeMutationEffectsOnFiber(fiber);
    } catch (error) {
      captureCommitPhaseError(fiber, fiber.return, error);
    }

    const sibling = fiber.sibling;
    if (sibling !== null) {
      sibling.return = fiber.return;
      nextEffect = sibling;
      return;
    }

    nextEffect = fiber.return;
  }
}


```

从上面的代码可以看出， **commitXXXEffects**作为每个阶段的入口函数存在。 **commitXXXEffects_begin** 从EffectList链表的头节点向下遍历，而 **commitBeforeMutationEffects_complete** 又从最下子节点向上遍历

```js
useEffect(()=>{
    // create
    return ()=>{
        // destroy
    }
})

```

结合Effect的代码，所以流程上是先向下，执行每一个节点的destory，当到尾节点后，再向上执行每一个节点的create函数。这样就能保证下一次组件更新或卸载时，按照正确的顺序执行。

## BeforeMutation阶段
这个阶段的主要工作是发生在 **commitBeforeMutationEffects_complete**  方法中的， 实际上也就是 **commitBeforeMutationEffectsOnFiber**

>在之前的版本中，对于当前Fiber元素上挂载的deletions，会进行unMount处理。但在现在的版本中，是抽象为 **commitPassiveUnmountEffects**，放在**ReactFiberWorkLoop** 中调用。

> 官方的说法是为了优化 **Commit** 阶段的性能。所以放在woorkLoop里，和其他的Effects一起处理，这样有利于Scheduler的调度。



commitBeforeMutationEffectsOnFiber 的主要代码，就处理2种类型的FiberNode
1. ClassComponent： 执行 getSnapShotBeforeUpdate
2. HostRoot: 执行 clearContainer方法，清空HostRoot挂载的内容，方便Mutation阶段渲染。
 

## Mutation阶段
> 在最新版本中 18.2.0  **commitMutationEffects** 内只有 **commitMutationEffectsOnFiber**

```tsx
export function commitMutationEffects(
  root: FiberRoot,
  finishedWork: Fiber,
  committedLanes: Lanes,
) {
  inProgressLanes = committedLanes;
  inProgressRoot = root;

 
  // 这个才是真正工作的函数
  commitMutationEffectsOnFiber(finishedWork, root, committedLanes);
 

  inProgressLanes = null;
  inProgressRoot = null;
}

```

### 1. 删除DOM元素 
CommitMutationEffects_begin

> 在18.2.0以前，有一个 **commitMutationEffects_begin**的方法，该方法主要对 fiber.deletions 进行处理， 删除DOM元素
> 但在最新的版本中，将删除的操作，抽象为 **recursivelyTraverseMutationEffects**
  


**commitMutationEffectsOnFiber** 这个方法，则根据finishedWork.tag的不同，执行不同的操作。

但每个类型，都会执行 **recursivelyTraverseMutationEffects** 和**commitReconciliationEffects**这两个方法

### recursivelyTraverseMutationEffects
这个方法的主要作用，是处理删除DOM元素

```jsx
<div>
	<SomeClassComponent/>
  <div ref={divRef}>
  	<SomeFunctionComponent/>
  </div>
</div> 

```

当要删除最外层div时，React的执行逻辑如下：
1. 判断 <SomeClassComponent /> 是类组件，于是执行 ComponentWillUnMount
2. 判断 <SomeFunctionComponent/> 是函数组件，则调用组件中的useEffect、useLayoutEffect的destory函数
3. devRef的卸载，这里需要注意的是，ref在 源码中，和FunctionComponent的处理方式是一样的。除此还有 MemoComponent、SimpleMemoComponent

> 整个删除操作，是以DFS的方式进行，遍历子树的每一个FiberNode，执行对应操作。
> 对应之前说的，从头遍历EffectList，依次执行对应的Effect

   


### 2. 插入、移动DOM元素
commitReconciliationEffects 这个方法的主要作用，是处理插入、移动DOM元素
```ts
function commitReconciliationEffects(finishedWork: Fiber) {
  
  const flags = finishedWork.flags;
  if (flags & Placement) {
    try {
     // 执行 Placement 对应操作
      commitPlacement(finishedWork);
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    } 
    // 这俩都二进制，所以可以进行位运算
    //  finishedWork.flags =  finishedWork.flags & ~Placement
     // 执行完 Placement 对应操作后，移除 Placement flag
    finishedWork.flags &= ~Placement;
  }
  if (flags & Hydrating) {
    finishedWork.flags &= ~Hydrating;
  }
}
```
从上面可以看出，主要执行的是 **commitPlacement**

```jsx

function commitPlacement(finishedWork){
  // 获取 Host 类型的祖先 FiberNode
  const parentFiber = getHostParentFiber(finishedWork);
  
  // 省略根据 parentFiber 获取对应 DOM 元素的逻辑
  
  let parent;
  
  // 目标 DOM 元素会插入至 before 左边
  const before = getHostSibling(finishedWork);
  
  // 省略分支逻辑
  // 执行插入或移动操作
  insertOrAppendPlacementNode(finishedWork, before, parent);
}

```

整个commitPlacement的方法如下：
1. 从当前FiberNode向上遍历，获取第一个类型为 HostComponent、hostRoot、HostPortal 三者之一的组件,其对应的DOM元素就是执行DOM操作的目标元素的父级DOM元素

2. 获取用于执行 ParentNode.insertBefore (child,before) 方法的 before对应DOM元素
3. 执行parentNode.insertBefore方法，或者  parentNode.appendChild方法，完成插入或移动操作

对于 **还没有插入的DOM元素** ，insertBefore方法会将目标DOM元素插入到before之前，appendChild会将目标DOM元素作为父DOM元素的最后一个子元素插入。

对于UI中已经存在的DOM元素 （对应update），inserBefore会将目标DOM元素**移动**到before之前，appendChild会将目标DOM元素移动到同级最后。

因此这也是为什么React中，插入和移动所对应的flag都是 placement flag的原因。


### 3. 更新DOM元素
更新DOM元素，就是更新对应的属性

在之前的版本是放在 **commitWork** 方法中，但在最新的版本，是直接放在了 **commitMutationEffectsOnFiber** 中 **HostComponent** 的类型分支中处理

```ts
// memoizedProps 上一次渲染时的props，pendingProps，本次渲染时的props
// 但这里的 memoizedProps 是从finishedWork 上获取的，也就是已经render完的FiberNode（reconciler阶段，commit里其实没有render这个概念），所以就是本次更新后的props，
// 当完成render，pendingProp 会赋值给 FiberNode.memoizedProps, 然后 pendingProp = null
const newProps = finishedWork.memoizedProps; 
const oldProps = current !== null ? current.memoizedProps : newProps;
const type = finishedWork.type;

// 变化的属性都存在updateQueue
const updatePayload = finishedWork.updateQueue;
finishedWork.updateQueue = null;
if(updatePayload !== null){
    // 存在变化的属性
    commitUpdate(instance, updatePayload, type, oldProps, newProps, finishedWork);
}

```

变化的属性会以key，value相邻的形式保存在FiberNode.updateQueue，最终在FiberNode.updateQueue里保存的要变化的属性，就会在一个名为 updateDOMProperties 方法遍历，然后进行处理，这里的处理主要是如下的四种数据

1. style属性变化
2. innerHTML
3. 直接文本节点变化
4. 其他元素属性的变化


```jsx

function updateDOMProperties(domElement, updatePayload, wasCustomComponentTag, isCustomComponentTag){
  for(let i=0;i< updatePayload.length; i+=2){
    const propKey = updatePayload[i];
    const propValue = updatePayload[i+1];
    if(propKey === STYLE){
      // 处理 style
      setValueForStyle(domElement, propValue);
    } else if(propKey === DANGEROUSLY_SET_INNER_HTML){
      // 处理 innerHTML
      setInnerHTML(domElement, propValue);
    } else if(propsKey === CHILDREN){
      // 处理直接的文本节点
      setTextContent(domElement, propValue);
    } else {
      // 处理其他元素
      setValueForProperty(domElement, propKey, propValue, isCustomComponentTag);
    }
  }
}

```

当Mutaion 阶段的主要工作完成后，会执行如下代码来完成FiberTree的交换

```jsx
root.current = finishedWork;

```

## Layout阶段

这一阶段的主要工作集中在 **commitLayoutEffectOnFiber**

这个方法和 **commitMutationEffectsOnFiber** 非常的类似，都是遍历FiberTree，根据 finishedWork.tag 类型不同，执行对应的副作用函数

对于 ClassComponent：该阶段会执行 componentDidMount/Update 方法
对于 FunctionComponent：该阶段会执行 useLayoutEffect 的回调函数