# beginwork 

Reconciler(协调器) 是React render阶段的核心工作，负责构建Fiber树并进行Diff算法。整个过程可以分为【beginWork】和【completeWork】两个主要阶段：

- 递：从根节点开始，深度优先遍历，依次调用每个Fiber节点的beginWork方法
- 归：从叶子节点开始，向上回溯，依次调用每个Fiber节点的completeWork方法

beginwork主要的工作是处理当前workInProgress Fiber节点，根据节点类型和更新情况，创建或复用下一级的FiberNode，并标记节点的更新类型和副作用。

## beginwork 流程

主要分为两大阶段： mount、update

首先，beginWork会根据当前节点对应的current FiberNode是否存在来判断是首次渲染（mount）还是更新（update）：

``` js
// beginWork 流程
 
 if(current !== null){
    // update 流程
 } else {
    // mount 流程
 }

```
在update流程中，首先会判断当前workInProgress FiberNode是否可以复用旧的current FiberNode：
- 如果可以复用，会更新workInProgress的属性并继续处理子节点
- 如果无法复用，则会创建新的FiberNode，此时update和mount流程大体一致

无论mount还是update，beginWork都会根据wip.tag进入不同的分支处理逻辑，并通过reconcile算法（Diff算法）生成下一级的FiberNode树。

无法复用的update流程和mount流程的主要区别在于：update流程会生成带副作用标记（flags）的FiberNode，而mount流程在初始渲染时不需要追踪副作用



```js

function beginWork(current, workInProgress, renderLanes){
    
    if(current !== null){
        // update 流程
    } else {
        // mount 流程
    } 

// 根据不同的 tag，进入不同的处理逻辑
// 关于tag，在react源码中定义了 28种tag


    switch(workInProgress.tag){
        case HostComponent:
            // 处理 HostComponent 类型的 FiberNode
            break;
        case HostText:
            // 处理 HostText 类型的 FiberNode
            break;
        default:
            // 其他类型的 FiberNode
            break;
    }
}


```

```js

export const  FunctionComponent = 0;
export const ClassComponent = 1;
export const IndeterminateComponent = 2; // before we know whether it is a function or a class
export const HostComponent = 3; // Root of a host tree. could be a div, span, etc.
export const HostText = 4;  // A subtree. could be a text node, or a comment node, etc.

```
 
- 不同的 FiberNode，会有不同的tag
- 根据不同的tag， 处理完FiberNode之后，根据是mount 还是update会进入不同的方法：


- mount：mountChildFibers
- update：reconcileChildFibers
这两个方法实际上都是一个叫 childReconcile 方法的返回值

```js

var reconcileChildFibers = childReconciler(true);
var mountChildFibers = childReconciler(false);

function ChildReconciler( shouldTrackSideEffects){
  
}

```


也就是说，在childReconciler方法中，根据shouldTrackSideEffects参数，返回不同的方法。
- false: 不追踪副作用，不做flags标记
- true： 追踪副作用，会做flags标记

```js
function placeChild(newFiber,lastPlacedIndex,newIndex){
  newFiber.index = newIndex;
  if(!shouldTrackSideEffects){
    // 不追踪副作用，不做flags标记
    newFiber.flags |= Forked
    return lastPlacedIndex;
  }


  // 说明是更新
  // 标记为 Placement
  newFiber.flags |= Placement;
  return newIndex;
}

```
需要注意的是，这些flags标记主要是在reconcileChildren过程中设置的，而不是直接在beginWork方法内部。这些标记主要和元素位置变化有关系：
- Placement: 代表新增或者移动
- ChildDeletion: 代表子节点删除



# 举个例子

```jsx
function App() {
  const [count, setCount] = useState(0);
  return <div onClick={() => setCount(count + 1)}>{count}</div>;
}
```

当点击div触发setCount后，React的执行流程如下：

1. React会从根节点开始，创建workInProgress Fiber树，以深度遍历的方式处理每个节点
2. 根节点的beginWork被调用：处理根节点并返回其第一个子节点（App组件节点）
3. App组件（FunctionComponent类型）的beginWork被调用：
   1. 执行App组件函数，获取新的React元素树（JSX）
   2. Diff对比新旧Fiber节点树（不是直接对比JSX）
   3. 复用子节点：div的HostComponent类型没有变化，可以复用旧的div Fiber节点
   4. 更新div节点的children属性，此时发现children是一个新的数字1（React会将其转换为HostText元素）
   5. 对比div的旧子节点HostText "0" 和新子节点HostText "1"
   6. 复用旧的HostText Fiber节点，但更新其内容为 "1"
   7. 收集副作用：标记HostText节点有文本更新的副作用
   8. 返回div节点
4. div节点的beginWork被调用：处理div节点并返回其第一个子节点（HostText "1"）
5. HostText节点的beginWork被调用：没有子节点，返回null
6. 遍历结束，进入commit阶段，执行副作用，更新div内的文本内容为1

