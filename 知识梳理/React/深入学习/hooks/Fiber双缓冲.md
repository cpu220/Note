# Fiber双缓冲

## 对Fiber 的理解

实际上，我们可以从三个维度来理解Fiber
- 是一种架构，称之为Fiber架构
- 是一种数据类型
- 动态的工作单元

### 是一种架构，称之为Fiber架构
在React V16 之前，使用的事 Stack Reconciler

- 也就是栈协调器，这种协调器的特点是递归，递归的特点是一旦开始就无法中断，如果组件树层级很深，那么递归的过程就会非常长，如果递归过程中有一些优先级更高的任务，那么这些优先级更高的任务就无法插入到递归过程中，这就会造成卡顿的现象，这就是React V16 之前的问题


从V16 开始，重构了整个架构，引入了Fiber， stack Reconciler 也变成了 Fiber Reconciler。 各个FiberNode之间通过链表形式串联起来

``` jsx
function FiberNode(
  this: $FlowFixMe, // 
  tag: WorkTag,
  pendingProps: mixed,
  key: null | string,
  mode: TypeOfMode,
) {
  // Instance
  // 定义Fiber类型，比如FunctionComponent，HostComponent，等，在reconciliation算法中，使用它来确定要完成的工作
  // 就是节点属性
  this.tag = tag; 
  // 唯一标识符
  this.key = key;
  // 大部分情况和type类似，某些情况不同，比如FunctionComponent使用React.memo包裹
  this.elementType = null;
  // 定义与此Fiber关联的函数或类。对于类组件，它指向构造函数，对于DOM元素，则指向HTML标签
  this.type = null;
  // 保存对数组，DOM节点，或与Fiber节点关联的其他React元素类型的类实例的引用。
  this.stateNode = null;


  // Fiber
  // 周围的 Fiber Node 通过链表的形式进行关联

  // 指向父 FiberNode， 因为一个动态的工作单元，return指代的是FiberNode执行完completeWork后返回的下一个FiberNode，这里会有一个返回的动作，因此，通过return来指代FiberNode
  this.return = null;
  // 指向第一个字Fiber节点的属性
  this.child = null;
  // 指向下一个兄弟FIber节点的属性
  this.sibling = null;
  // 当前Fiber在其他兄弟节点中的位置索引
  this.index = 0;

  // 保存对组件或DOM节点的引用，可以通过React.createRef或ref回调函数创建
  this.ref = null;
//   用于清理ref的回调函数，在卸载组件时调用
  this.refCleanup = null;

// 新的props，也就是nextProps
  this.pendingProps = pendingProps;
//   用于在上一次渲染期间，创建输出的Fiber的props
  this.memoizedProps = null;
//   状态更新，回调和DOM更新的队列。 Fiber对应的组件所产生的update都会放在该队列中
//  变化的属性就会存在这里
  this.updateQueue = null;
//   当前屏幕UI对应的状态，上一次输入更新的Fiber state
  this.memoizedState = null;
//   一个列表，储存该Fiber依赖的contexts，events
  this.dependencies = null;

// 共存的模式表示这个子树是否默认是异步渲染的。Fiber刚被创建时，会集成父Fiber的mode
  this.mode = mode;
  
  // Effects

//  当前Fiber阶段，需要进行的任务（增删改）
  this.flags = NoFlags;
//   当前Fiber子树需要进行任务，（增删改）
  this.subtreeFlags = NoFlags;
//   当前Fiber子树需要删除的节点列表
  this.deletions = null;

// 当前Fiber 需要处理的优先级信息
  this.lanes = NoLanes;
//   当前Fiber子树，需要处理的优先级信息
  this.childLanes = NoLanes;
// 交替指向， current Fiber（当前页面上显示的Fiber树），指向work in progress fiber（正在构建的新的fiber树）；当构建完成 ，work in progress fiber  的 这个属性，就会指向原来的 current fiber，而原来的 current fiber 的alternate属性，会指向新的current fiber。这样进行fiber交换。
  this.alternate = null;
 
}

```

### 是一种数据类型
Fiber 本质上也是一个对象，是在之前React元素基础上的一种升级版本。
每个FiberNode 对象里面，包含React元素的类型、周围链接的FiberNode以及DOM相关信息

``` jsx
  this.tag = tag;
  this.key = key;
  this.elementType = null;
  this.type = null; // 
  this.stateNode = null;  // 映射真实DOM

```


### 动态的工作单元
在每个FiberNode 中，保存了本次更新中，该元素变化的数据，还有要执行的工作（增删改）
``` jsx 
// 副作用相关
 this.flags = NoFlags;
  this.subtreeFlags = NoFlags;
  this.deletions = null;

// 与调度优先级有关
  this.lanes = NoLanes;
  this.childLanes = NoLanes;


```


## Fiber 双缓冲

Fiber架构中，的双缓冲工作原理，类似于显卡
显卡分为前缓冲区 和后缓冲区。
- 首先，前缓冲区会显示图像，之后，合成的新的图像会被写入到后缓冲区，一旦后缓冲区写入图像完毕，就会前后缓冲区进行一个呼唤
- 这种将数据保存在缓冲区再进行互换的技术，就被称之为双缓冲技术。

所以，在Fiber架构中，有两颗Fiber tree，一颗是真实UI对应的Fiber，类似前缓冲区。另一颗是在内存中构建的Fiber tree，可以类比为显卡的后缓冲区。

在react源码中，很多方法都需要接收两颗FiberTree

``` js
current.alternate = workInProgress
workInprogress.alternate = current;

```

### mount 阶段
首先，最顶层有一个FiberNode，称之为FiberRootNode，该FiberNode会有一些自己的任务
- current Fiber Tree（前缓冲区） 与wip Fiber Tree （后缓冲区）之间进行切换
- 应用中的过期时间
- 应用的任务调度信息

下面进行案例分析
``` html
<body>
    <!-- HostRootFiber -->

    <div id="root"></div> 
</body>

```

``` jsx
function App(){
    const [num ,add] = useState(0)
    return (
        <p onClick={()=>add(num+1)}>{num}</p>
    )
    
}

const rootElement = document.getElementByid('root')
ReactDOM.createRoot (rootElement).render(<App />)

```

- 当执行ReactDOM.createRoot的时候，FiberRootNode.current =》 HostRootFiber 
  - HostRootFiber 就是  <div id="root"></div>
- 进入mount流程
  - 该流程会基于每个 React 元素，以深度优先的原则，依次生成wip FiberNode，并且每一个wip FiberNode会链接起来
  - 生成的 wip FiberTree（正在构建的） 里面的每一个 FiberTree会和current FiberTree（当前界面上展示的） 里面的FiberNode进行关联。关联的方式就是通过alternate。
  - 但是，目前currentFiberTree里面只有一个HostRootFiber（因为<div id="root"></div> 是空的），因此就只有这个HostRootFiber进行了alternate的关联。
- 当wip FiberTre （新的FibeNode）生成完毕，就意味着render阶段完成了。此时FiberRootNode就会被传递给Render（渲染器），接下来就是进行渲染工作
- 渲染工作完毕后，浏览器就就显示了对应的UI
  - 此时FiberRootNode.current 就会指向这颗wip fiberTree
  - 曾经的 Wip Fiber tree就会变成current FiberTree，完成双缓存的工作

### update 阶段
- 当触发更新，就会开启update流程，此时就会生成一颗新的wip FiberTree，流程和mount一样
- 新的wip FiberTree 里面的每一个FiberNode 和current Fiber Tree的每一个FiberNode，通过alternate属性进行关联
- 当wip FiberTree生成完毕后，就会经历和之前一样的流程，FiberRootNode会被传递给Render进行渲染，此时宿主环境所渲染 出来的真实UI，对应的就是wip Fibertree（新的）所对应的DOM结构，FiberRootNode.current 就会指向它，而之前的 current（旧的），就会成为新的 wip fiberTree
- 
 
也就是说， 每一个  FiberRootNode 有2棵FiberTree， 一个是current FiberTree ，一个是Wip TFiberree




## 总结


react16 以后引入的一种新的内部架构，是对react的核心算法重新实现，旨在提高react在动画，布局，手势等领域的实用性

主要热点是增量渲染，也就是说，它可以将渲染工作分割成多个小块，并在多个帧中完成，从而避免阻塞主线程。


## 优势
1. 可以暂停、继续、或者取消渲染工作，根据新的更新来调整优先级
2. 可以复用已完成的工作，或者丢弃不需要的工作
3. 可以为不同类型的更新分配不同的优先级
4. 提供了新的并发原语（concurrency primitives）

Fiber 可以从三个方面进行理解

1. FiberNode 作为一种架构
    - 在react V15 之前的版本，reconceiler采用的是递归的方式，到了v16之后，引入了Fiber, 从而将各个FiberNode之间通过链表的形式串联起来
2. FiberNode 作为一种数据类型
    - Fiber本质上是个对象，是之前虚拟DOM对象的一种升级版本，每个Fiber对象里面包含React元素的类型，周练威廉的FiberNode，DOM相关信息。
3. FiberNode 作为动态的工作单元，在每个FiberNode中，保存了【本次更新中，该React元素变化的数据、要指向的工作（增删改等）】 等信息


## Fiber的设计思路

帧的概念， 10000/60   16ms，如果在16ms内完成渲染，那么就会保持60fps，如果超过了16ms，那么就会掉帧，导致卡顿。

1. fiber 实现了一个基于优先级和requestIdleCallback的调度器, 将任务拆分为多个小任务
    * 为了方便控制进度。 中止、恢复

2. fiber 是把 render/update 分片，拆解成多个小任务来执行，每次只检查树上部分节点，昨晚此部分后，若当前一帧内还有足够的时间，就继续做下一个小任务，时间不够就暂停，等主线程空闲后，再继续下一个小任务。

3. fiber 是一个链表结构，每个节点就是一个fiber对象，每个fiber对象就是一个任务，每个任务都有一个优先级，优先级高的先执行，优先级低的后执行，优先级相同的，就按照顺序执行。 fiber node

也正是因为这个原因，所以组件更新过程中，render中的 componentWillMount componentWillReceiveProps componentWillUpdate这几个会频繁调用，所以取消掉了。



## 双缓冲的理解
而所谓的Fiber双缓冲树，就是在内存中构建两颗树，一个叫current FiberTree，指的是当前浏览器显示的UI，另一个叫 work in Progress FiberTree，指的是正在构建的内容。
这两颗树在渲染更新中交替更替，通过alternate指针互相指向。这样在下一次渲染的时候，直接复用 wip FiberTree作为下一次的渲染树，而上一次的渲染树又作为新的 wip FiberTree。 这样可以加快DOM节点的替换与更新。

