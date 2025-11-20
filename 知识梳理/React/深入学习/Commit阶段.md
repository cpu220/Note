# commit 工作流程

> 以下代码 是 V18.0.0的版本，到了18.1.0后，有较大的改变

## React的工作流程
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

> 需要注意：Render 阶段是在内存中运行，这意味着可能被打断，也可以被打断。而commit阶段一旦开始，就会同步执行，直到完成。
> Mutation : （动物或植物的）突变，变异；（基因结构突变产生的）突变体，突变型；（形式的）转变，改变；语流音变，变音

### commitXXXEffects

这个函数，是每个子阶段的入口函数， finishedWork 会作为firstChild 参数传入进去
root是React应用的根节点，finishedWork 是root的一个属性，表示当前完成更新的FiberTree

```jsx
// packages/react-reconciler/src/ReactFiberWorkLoop.js

const shouldFireAfterActiveInstanceBlur = commitBeforeMutationEffects(
      root,
      finishedWork,
    );
// packages/react-reconciler/src/ReactFiberCommitWork.new.js
function commitXXXEffects(Root, firstChild){
    // 省略标记全局变量
    nextEffect = firstChild;
    // 省略重置全局变量
    commitXXXEffects_begin();
}


```

### commitXXXEffects_begin
向下遍历FiberNode，遍历的时候会遍历直到第一个满足如下条件之一的 FiberNode
1. 当前的FiberNode的子FiberNode不包含该子阶段对应的flags
2. 当前的FiberNode不存在子FiberNode

然后对目标FiberNode 执行 commitXXXEffects_complete方法，

```jsx
function commitXXXEffects_begin(){
    while(nextEffect !== null){
        let fiber = nextEffect;
        let chile = fiber.child;

        if(fiber.subtreeFlags !== NoFlags && child !== null){
            nextEffect = child
        }else {
            commitXXXEffects_complete()

        }
    }
}

```

### commitXXXEffects_complete
该方法主要就是针对flags做具体的操作了，主要包含以下三个步骤

1. 对当前FiberNode执行flags对应的操作，也就是执行 commitXXXOnFiber
2. 如果当前FiberNode存在兄弟节点，则对兄弟FiberNode执行 commitXXXEffects_begin
3. 如果当前FiberNode不存在兄弟节点，则对父FiberNode执行 commitXXXEffects_complete

```jsx

function commitXXXEffects_complete(root){

    while(nextEffect !== null){
        let fiber = nextEffect;

        try{
            commitXXXEffectsOnFiber(fiber,root);
        }catch(){ }

        let sibling = fiber.sibling;
        if(sibling !== null){
            nextEffect = sibling;
            return;
        }

        // 将父节点作为下一个effect
        nextEffect = fiber.return;  
    }
}

```

> nextEffect 是 React 源码中的一个全局变量，它的作用是在 commit 阶段遍历 effectList 链表，执行对应的副作用函数。effectList 链表是在 render 阶段收集的，它包含了所有有更新的 fiber 节点，每个节点都有一个 effectTag 属性，表示它的更新类型2。

> 每个子阶段都会以DFS （深度遍历）的原则进行遍历，最终会在commitXXXEffectsOnFiber中针对不同的flags做出不同的处理




### BeforeMutation阶段
BeforeMutation阶段的主要工作发生在 **commitBeforeMutationEffects_complete**  中的  commitBeforeMutationEffectsOnFiber 方法

```jsx

/**
 * 该函数是遍历effectList链表，执行一些副作用函数，比如 getSnapsshotBeforeUpdate
 * @param finishedWork 在render阶段完成的FiberTree的根节点，是在 performConcurrentWorkOnRoot 函数中被赋值 
 * 
 */
function commitBeforeMutationEffectsOnFiber(finishedWork){
  const current = finishedWork.alternate;
  const flags = finishedWork.flags;
  
  //...
  // Snapshot 表示 ClassComponent 存在更新，且定义了 getSnapsshotBeforeUpdate 方法
  if(flags & Snapshot !== NoFlags) {
    switch(finishedWork.tag){
      case ClassComponent: {
        // 当前指针不为空
        if(current !== null){
          const prevProps = current.memoizedProps;
          const prevState = current.memoizedState;
          const instance = finishedWork.stateNode;
          
          // 执行 getSnapsshotBeforeUpdate
          const snapshot = instance.getSnapsshotBeforeUpdate(
          	finishedWork.elementType === finishedWork.type ? 
            prevProps : resolveDefaultProps(finishedWork.type, prevProps),
            prevState
          )
        }
        break;
      }
      case HostRoot: {
        // 清空 HostRoot 挂载的内容，方便 Mutation 阶段渲染
        if(supportsMutation){
          const root = finishedWork.stateNode;
          clearContainer(root.containerInfo);
        }
        break;
      }
    }
  }
}

```

上面的代码，主要是处理两种类型的FiberNode
1. ClassComponent：执行 getSnapshotBeforeUpdate 方法
2. HostRoot：执行 clearContainer 方法，清空HostRoot挂载的内容，方便Mutation阶段渲染


## Mutation 阶段
对于HostComponent、Mutation阶段的主要工作，就是对DOM 进行 增删改操作

入口函数是 commitMutationEffects， 但实际上，真正的工作是在 commitMutationEffectsOnFiber 中完成的
 
``` jsx

export function commitMutationEffects(
  root: FiberRoot,
  finishedWork: Fiber,
  committedLanes: Lanes,
) {
  inProgressLanes = committedLanes;
  inProgressRoot = root;

  // setCurrentDebugFiberInDEV(finishedWork);
  // 这个才是真正的工作函数
  commitMutationEffectsOnFiber(finishedWork, root, committedLanes);
  // setCurrentDebugFiberInDEV(finishedWork);

  inProgressLanes = null;
  inProgressRoot = null;
}


```


### 删除DOM元素

```jsx

function commitMutationEffects_begin(root){
  while(nextEffect !== null){
    const fiber = nextEffect;
    // 删除 DOM 元素
    const deletions = fiber.deletions;
    
    if(deletions !== null){
      for(let i=0;i<deletions.length;i++){
        const childToDelete = deletions[i];
        try{
          commitDeletion(root, childToDelete, fiber);
        } catch(error){
          // 省略错误处理
        }
      }
    }
    
    const child = fiber.child;
    if((fiber.subtreeFlags & MutationMask) !== NoFlags && child !== null){
      nextEffect = child;
    } else {
      commitMutationEffects_complete(root);
    }
  }
}

```

删除DOM元素的操作，是发生在 **commitMutationEffects_begin** 方法中，首先会先拿到 deletions 数组，之后再遍历该数组，进行删除操作。

> 需要注意的是，删除一个元素，不仅仅是删除节点，还要将节点上注册的事件也要注销掉等，防止内存溢出

1. 子树中所有组件的 unMount 操作
2. 子树中所有ref 属性的卸载操作
3. 子树中所有Effect 相关 Hook 的 destory 回调的执行


```jsx
<div>
	<SomeClassComponent/>
  <div ref={divRef}>
  	<SomeFunctionComponent/>
  </div>
</div>

```

当删除最外层div时
1. 执行 SomeClassComponent 类组件对应的 ComponentWillUnmount 生命周期函数
2. 执行 SomeFunctionComponent 函数组件中的 useEffect、 useLayoutEffect 的 destory 回调
3. devRef 的卸载操作

> 整个删除操作，是以DFS（深度遍历）的顺序，遍历子树的每个FiberNode，执行对应的操作
 


### 插入、移动DOM元素

```jsx
function commitMutationEffectsOnFiber(finishedWork, root){
  const flags = finishedWork.flags;

  // ...
  
  const primaryFlags = flags & (Placement | Update | Hydrating);
  
  outer: switch(primaryFlags){
    case Placement:{
      // 执行 Placement 对应操作
      commitPlacement(finishedWork);
      // 执行完 Placement 对应操作后，移除 Placement flag
      finishedWork.flags &= ~Placement;
      break;
    }
    case PlacementAndUpdate:{
      // 执行 Placement 对应操作
      commitPlacement(finishedWork);
      // 执行完 Placement 对应操作后，移除 Placement flag
      finishedWork.flags &= ~Placement;
      
      // 执行 Update 对应操作
      const current = finishedWork.alternate;
      commitWork(current, finishedWork);
      break;
    }
      
    // ...
  }
  

}

```
可以看出， Placement flag 对应的操作方法为 commitPlacement，代码如下：

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

整个 commitPlaceMent 方法，可以分为三个步骤
1. 从当前FiberNode向上遍历，获取第一个类型为 HostComponent、HostRoot、HostPortal 三者之一的组件FiberNode，其对应的DOM元素是执行DOM操作的目标元素的父级DOM元素

2. 获取用于执行 ParentNode.insertBefore(child,before) **方法的 before 对应的DOM元素**
3. 执行parentNode.insertBefore方法(存在before)或者parentNode.appendChild方法(不存在before)

对于 **还没有插入的DOM元素** （对应的就是mount场景），insertBefor 会将目标DOM元素插入到before之前，appendChild 会将目标DOM元素作为父DOM元素的最后一个子元素插入

对于UI中已经存在的DOM元素 （对应update场景），insertBefore会将目标DOM元素移动到before之前，appendChild会将目标DOM元素移动到同级最后。

因此，这也是为什么在React中，插入和移动所对应的 flag 都是 placement flag 的原因，



### 更新DOM元素
更新DOM元素，主要就是更新对应的属性，执行的方法为commitWork，代码如下：

```jsx
function commitWork(current, finishedWork){
  switch(finishedWork.tag){
    // 省略其他类型处理逻辑
    case HostComponent:{
      const instance = finishedWork.stateNode;
      if(instance != null){
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
      }
      return;
    }
  }
}

```
变化的属性会以key，value相邻的形式保存在 FiberNode.updateQueue,最终在FiberNode.updateQueue里保存的要变化的属性，就会在一个名为 updateDOMProperties 方法遍历，然后进行处理，这里的处理主要是如下的四种数据

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

当 Mutation 阶段的主要工作完成后，在进入Layout阶段之前，会执行如下代码来完成 FiberTree的切换, 也就是双缓冲

```jsx

root.current = finishedWork;

```



## Layout 阶段
有关DOM元素的操作，在 Mutation 阶段完成 
在这一阶段，主要的工作集中在  commitLayoutEffectOnFiber 函数中，该函数会遍历 effectList 链表，对于不同的FiberNode，执行不同的操作。执行一些副作用函数，比如 useEffect、useLayoutEffect 的回调函数。


- 对应 classComponent ： 该阶段会调用 componentDidMount、componentDidUpdate 方法
- 对于 FunctionComponent： 该阶段会调用 useLayoutEffect 的回调函数，useEffect 的回调函数会在 Layout 阶段之后异步执行

---

# v18.2.0

对于之前的 BeforeMutation 和 Mutation阶段，有些变动

## BeforeMutation 的改动

不同于之前，对于deletions的操作是放在  **commitMutationEffects_begin** 里，新版函数改成了 **recursivelyTraverseMutationEffects** 

> recursivelyTraverseMutationEffects 替代了旧的 commitMutationEffects_begin，但这背后的核心目标是 适配 React 18 的并发渲染、自动批处理等新特性，让副作用处理更高效、更稳定。
> 核心逻辑没变 —— 还是 “先处理 deletions，再处理其他 Mutation 副作用”,无论函数名怎么改，React Commit 阶段的 Mutation 阶段核心流程始终不变：
1. 先处理 deletions 数组（删除旧 DOM 节点）；
2. 再遍历 workInProgress 树，处理其他 Mutation 副作用（如插入新节点、更新节点属性）。
> 这是因为：必须先删除不需要的旧节点，再插入 / 更新新节点，避免 DOM 结构混乱（比如新节点插入到已删除的旧节点位置）。

为什么改函数名？—— 从 “阶段开始” 到 “递归遍历” 的逻辑聚焦

- 旧函数名 commitMutationEffects_begin 强调的是 “Mutation 阶段的开始步骤”，而新函数名 recursivelyTraverseMutationEffects 更准确地描述了 “通过递归遍历 Fiber 树，批量处理所有 Mutation 副作用” 的核心行为。

而之前放在commitBeforeMutationEffects_begin里，新版本抽象为 **commitPassiveUnmountEffects_begin**

并且以 **commitPassiveUnmountEffects** 暴露给ReactFiberWorkLoop 调用
```jsx
export function commitPassiveUnmountEffects(firstChild: Fiber): void {
  nextEffect = firstChild;
  commitPassiveUnmountEffects_begin();
}

/***
 * 这个函数主要是在DOM变更之前，执行一些副作用函数，比如useEfect
 *  
 * 
 */ 
function commitPassiveUnmountEffects_begin() {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    const child = fiber.child;

    if ((nextEffect.flags & ChildDeletion) !== NoFlags) {
      const deletions = fiber.deletions;
      if (deletions !== null) {
        // 遍历当前节点的 deletions，对每一个要删除的fiber节点，执行卸载处理
        for (let i = 0; i < deletions.length; i++) {
          const fiberToDelete = deletions[i];
          nextEffect = fiberToDelete;
          commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
            fiberToDelete,
            fiber,
          );
        }

        if (deletedTreeCleanUpLevel >= 1) {
         
          const previousFiber = fiber.alternate;
          if (previousFiber !== null) {
            let detachedChild = previousFiber.child;
            if (detachedChild !== null) {
              previousFiber.child = null;
              do {
                const detachedSibling = detachedChild.sibling;
                detachedChild.sibling = null;
                detachedChild = detachedSibling;
              } while (detachedChild !== null);
            }
          }
        }

        nextEffect = fiber;
      }
    }

    if ((fiber.subtreeFlags & PassiveMask) !== NoFlags && child !== null) {
      child.return = fiber;
      nextEffect = child;
    } else {
      commitPassiveUnmountEffects_complete();
    }
  }
}

```



这么改动，官方的说法是为了优化 **commit** 阶段的性能。
因为原来的方式，会导致commit阶段的时间过长，所以在新版里，deletions是在workLoop里，和其他effects一起处理。这样有利于Scheduler的调度机制


## Mutation 的改动

主要是对于副作用的处理进行了调整。

```jsx

function commitMutationEffectsOnFiber(
  finishedWork: Fiber,// 当前Fiber节点
  root: FiberRoot, // FiberRoot对象
  lanes: Lanes, // 已完成的lanes
) {
  const current = finishedWork.alternate;
  const flags = finishedWork.flags;
 
  switch (finishedWork.tag) {
    // 函数式组件
    case FunctionComponent:
      // 转发ref的组件
    case ForwardRef:
      // React.forwardRef((props,ref)=>{}),在commit阶段会执行组件的渲染函数，并更新stateNode为返回的React元素
      // React.memo包裹的组件，用来优化性能，避免不必要的重渲染
    case MemoComponent:
      // React.memo包裹的组件，并且只有一个子节点，在commit阶段会执行组件的渲染函数，并更新stateNode为返回的React元素
    case SimpleMemoComponent: {
       
    }
    // 类组件
    case ClassComponent: {

      // 递归遍历并处理Fiber节点树上的mutation effects（变更效果）。这些效果可能包括组件的更新、删除或插入等。
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);

      // 提交reconciliation effects（协调效果）。这些效果是在React的协调阶段产生的，包括组件的更新、删除或插入等。
      commitReconciliationEffects(finishedWork);

      // 检查finishedWork的flags是否包含Ref标志。如果包含，说明这个Fiber节点有关联的ref。
      if (flags & Ref) {
        // 如果current（即当前的Fiber节点）不为null，说明这个Fiber节点在上一次渲染中是存在的。
        if (current !== null) {
          // 安全地解除current与其关联的ref的关系。这通常在组件卸载或ref改变时发生。
          safelyDetachRef(current, current.return);
        }
      }

      // 检查finishedWork的flags是否包含Callback标志，并且offscreenSubtreeIsHidden为true。如果满足，说明这个Fiber节点有关联的回调函数，且其子树是隐藏的。
      if (flags & Callback && offscreenSubtreeIsHidden) {
        // 获取finishedWork的updateQueue，这个队列中存放了这个Fiber节点的所有待处理的更新。
        const updateQueue: UpdateQueue<mixed> | null =
          (finishedWork.updateQueue: any);
        // 如果updateQueue不为null，说明有待处理的更新。
        if (updateQueue !== null) {
          // 延迟处理隐藏的回调函数。这通常在组件被隐藏时发生，以优化性能。
          deferHiddenCallbacks(updateQueue);
        }
      }
      return;
    }
    // 可以提升到父节点的宿主组件，如注释节点，在commit阶段会创建或更新对应的DOM节点，并添加到父节点中
    case HostHoistable: {
       
      // Fall through
    }
    // 表示不能提升到父节点的宿主组件，如文本节点，在commit阶段会创建更新对应节点，并添加到父节点中。
    case HostSingleton: {
      
      // Fall through
    }
    // 表示普通的宿主组件，如div、span等，在commit阶段会创建或更新对应的DOM节点，并添加到父节点中
    case HostComponent: {
       
      return;
    }
    // 表示文本内容
    case HostText: {
       
      return;
    }
    // 根节点
    case HostRoot: {
       
      return;
    }
    // 传送门组件，创建脱离文本流的组件，
    case HostPortal: {
       
      return;
    }
    // suspense组件，用来实现一步加载和延迟渲染，在commit阶段会根据当前的状态，选择显示fallback或children，并执行相关逻辑
    case SuspenseComponent: {
      
      return;
    }
    // Offscreen组件，用来实现隐藏或延迟渲染，在commit阶段会根据当前章台选择显示货隐藏子节点
    case OffscreenComponent: {
      
      return;
    }
    // 表示SuspenseList组件，用来控制多个Suspense组件之间的加载顺序
    case SuspenseListComponent: {
       
     
      return;
    }
    // 表示Scope组件，用来实现时间委托和事件冒泡，在commit阶段不做任何操作
    case ScopeComponent: {
       
      return;
    }
    default: {
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);

    //  这个方法，就是用来注销effect的
      commitReconciliationEffects(finishedWork);

      return;
    }
  }
}

```

### commitReconciliationEffects

这里的内容，就和之前版本的 commitMutationEffectsOnFiber 内容有关。

``` jsx
function commitReconciliationEffects(finishedWork: Fiber) {
  
  const flags = finishedWork.flags;
  if (flags & Placement) {
    try {
        // 核心就这么一个方法执行
      commitPlacement(finishedWork);
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
     
    finishedWork.flags &= ~Placement;
  }
  if (flags & Hydrating) {
    finishedWork.flags &= ~Hydrating;
  }
}



```
### commitPlacement
这个方法，是用来插入新的DOM节点的，根据 flashedWork的effectTag，来判断是否需要插入新的节点。
如果是，就先清空

```jsx

function commitPlacement(finishedWork: Fiber): void {
  if (!supportsMutation) {
    return;
  } 
   // 获取 Host 类型的祖先 FiberNode
  const parentFiber = getHostParentFiber(finishedWork);
 
  switch (parentFiber.tag) {
    case HostComponent: {
      const parent: Instance = parentFiber.stateNode;
      if (parentFiber.flags & ContentReset) { 
        resetTextContent(parent);
       
        parentFiber.flags &= ~ContentReset;
      }
 // 目标 DOM 元素会插入至 before 左边
      const before = getHostSibling(finishedWork);
     // 执行插入或移动操作
      insertOrAppendPlacementNode(finishedWork, before, parent);
      break;
    }
    case HostRoot:
    case HostPortal: {
      const parent: Container = parentFiber.stateNode.containerInfo;
      const before = getHostSibling(finishedWork);
      insertOrAppendPlacementNodeIntoContainer(finishedWork, before, parent);
      break;
    }
    // eslint-disable-next-line-no-fallthrough
    default:
      throw new Error(
        'Invalid host parent fiber. This error is likely caused by a bug ' +
          'in React. Please file an issue.',
      );
  }
}

```

# 总结

commit 主要是3个阶段
- BeforeMutation 阶段，主要是处理ClassComponent、HostRoot 两种类型的FiberNode
- Mutation 阶段，主要是处理DOM的增删改
- Layout 阶段，会根据不同的FiberNode的类型不同，执行对应的副作用函数

按照类比的话

BeforeMutation 是拿着设计图(wip.fiberTree)准备处理装修前的准备工作
Mutation 按照设计图(wip.fiberTree)，进行装修（处理DOM的增删改）
装修完成后，将 wip.fiberTree（当前的设计图） 进行互换 current.fiberTree （之前的设计图）
Layout 阶段，就是处理装修后的副作用
