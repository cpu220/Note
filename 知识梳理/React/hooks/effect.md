# effect 相关hook
> effect 和 useLayoutEffect的区别


在react中，用于定义有副作用 因变量的hook有三个:
1. useEffect:回调函数会在commit阶段完成后异步执行，所以不会阻塞视图渲染
2. useLayoutEffect: 回调函数会在commit阶段的layout子阶段同步执行，一般用于执行DOM相关的操作
3. useInsertionEffect：回调函数会在commit阶段的Mutation子阶段同步执行，与useLayoutEffect 的区别在于执行的时候无法访问对DOM的引用，这个hook是专门为 css-in-js库插入全局的style元素而设计。


## 一、数据结构
对于这三个effect 相关的hook， hook.memoizedState共同使用同一套数据结构

> memoizedState 是react Hooks 的一个内部属性，用来存储组件的状态和副作用。每个组件的 **memoizedState** 都是一个链表，每个节点对应一个hook，包含了hook的类型、参数、返回值和依赖心系。
> React通过 **memoizedState** 来管理组件的状态更新和副作用

```ts
// pushEffect 函数内
const effect = {
    // 用于区分effect 类型 passive | Layout | Insertion
    tag,
    // effect 回调函数
    create,
    // effect 销毁函数
  
    destory,
    // 依赖项
    deps,
    // 与当前FC的其他effect形成环状链表，就是指针
    next:null
} 

```
上面的这个对象，就是 pushEffect 往链表上挂载effect的时候，创建的数据接口

### destory:
用于销毁effect的回调函数
> 需要注意的是， 当前effect的destory函数，是在  pushEffect 函数内创建effect对象的时候，由入参destory而来
> 而入参的这个destory，是上一个effect ,也就是prevEffect.destory  ,参考 updateEffectImpl函数
> 这样，每次更新，就可以先清除上一次的副作用，然后再执行新的副作用。

如果不这样，，那么可能会导致内存泄露等，比如下面的代码
```ts

import React, { useState, useEffect } from 'react';

function OnlineStatus() {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    // 模拟用户每隔3秒切换一次在线状态
    const timer = setInterval(() => {
      setOnline((prev) => !prev);
    }, 3000);

    // 忘记了返回清除函数
    // return () => {
    //   clearInterval(timer);
    // };
  }, []);

  // 点击按钮可以手动切换在线状态
  const handleClick = () => {
    setOnline((prev) => !prev);
  };

  return (
    <div>
      <p>用户当前{online ? '在线' : '离线'}</p>
      <button onClick={handleClick}>切换状态</button>
    </div>
  );
}

```
上面的代码，如果每次点击按钮，触发了 effect，都会重新创建一个timer，因为timer会一直存在，就会一直占用内存。


### tag

tag用来区分 effect 的类型：
- Passive： useEffect
- layOut： useLayoutEffect
- Insertion： useInsertionEffect

create和destory 分别指代effect的回调函数，以及effect 销毁函数

``` js

useEffect(()=>{
// create
    return ()=>{
        // 返回一个函数，在下一次effect执行前，执行这个函数，就是destory 
    } 
},[])

 
```

next 字段会与当前的函数组件的其他effect 形成环状链表，链接的方式是一个单项环状链表。

```jsx

function App(){
    useEffect(()=>{
        console.log(1)
    })

    const [num1,setNum1] = useState(0)
    const [num2,setNum2] = useState(0)

    useEffect(()=>{
        console.log(2)
    })

    useEffect(()=>{
        console.log(3)
    })

    return <div>hello</div>
}
```

上面的代码，FiberNode.memoizedState 会是这样的

 hook1 -> next -> hook2
 hook2 -> next-> hook3
 hook3 -> next -> hook4  
 hook4 -> next -> hooke5 

hook1 -> memoziState -> effect ->  next -> hook4.effect
hook4 -> memoziState -> effect  ->  next -> hook5.effect
hook5 -> memoziState -> effect ->  next -> hook1.effect

effect 会形成一个环状链表，这样的好处是，当某个effect被销毁时，可以很方便的找到下一个effect，从而执行下一个effect的销毁函数
 


## 二、工作流程

整个工作流程可以分为三个阶段：

### 1. 声明阶段
#### 1.1 mount 阶段
这个阶段执行的是mountEffectImpl，代码声明如下

**mountEffectImpl** 是用来在组件挂载时

```tsx

function mountEffectImpl(fiberFlags, hookFlags, create, deps): void {
    // 创建hook对象
  const hook = mountWorkInProgressHook();
    // 保存依赖的数组
  const nextDeps = deps === undefined ? null : deps;
    // 修改当前的Fiber的flag
  currentlyRenderingFiber.flags |= fiberFlags;
   // 将pushEffect 返回的 **环形链表** 存储到hook 对象的 memoizedState 字段上
// 在react中，每个组件的 memoizedState 都是一个环状链表，这个链表的头部是一个effect对象，这个effect对象的next字段指向下一个effect对象，最后一个effect对象的next字段指向第一个effect对象，这样就形成了一个环状链表
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    undefined,
    nextDeps,
  );
}
```

在上面的代码中，首先生成hook对象，拿到依赖，修改fiber的flag，之后将当前的effect推入到环状链表，hook.memoizedState指向该环状链表



#### 1.2 update 阶段

update的时候，执行的是 updateEffectImpl，代码如下：

```tsx

function updateEffectImpl(fiberFlags, hookFlags, create, deps): void {
    // 创建hook对象
  const hook = updateWorkInProgressHook();
//   保存依赖的数组
  const nextDeps = deps === undefined ? null : deps;
//   初始化清除effect 函数
  let destroy = undefined;
// 如果当前的hook不为空，说明是更新阶段，那么就需要将上一次的effect销毁
  if (currentHook !== null) {
    // 从当前hook对象中，memoizedState 字段，拿到上一个effect
    const prevEffect = currentHook.memoizedState;
    // 拿到对应的销毁函数
    destroy = prevEffect.destroy;
    // 如果依赖不为空
    if (nextDeps !== null) {
        // 获取上一次的依赖
      const prevDeps = prevEffect.deps;
    //   两个依赖进行比较
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        // 如果依赖的值相同，即依赖没有变化，那么只会给这个effect 打上一个 hookPassive  一个tag
        // 然后，在组件渲染完以后，会掉过这个effect的执行
        hook.memoizedState = pushEffect(hookFlags, create, destroy, nextDeps);
        return;
      }
    }
  }
// 如果deps依赖发生改变，赋予 effectTag， 在commit 节点，就会再次执行我们的effect
  currentlyRenderingFiber.flags |= fiberFlags;
// pushEffect 的作用，就是将当前effect天假到 FiberNode 的 updateQueue 中，然后返回这个effect
// 再把返回的effect 保存到Hook 节点的 memoizedState 字段上
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    destroy,
    nextDeps,
  );
}

```

在上面的代码中，首先从 updateWorkInProgressHook 拿到hook对象。之后会从hooke.memoizedState拿到所存储的effect对象
再利用  areHookInputsEqual 方法，进行前后依赖比较，如果依赖相同，那么说明没有发生变化，就会在effect上打一个tag，然后在commit阶段，就会跳过这个effect的执行
如果依赖发生了变化，那么当前的FiberNode就会打上一个flags，回头在commit阶段，统一执行该effect，之后会推入新的effect，到环状链表上。

##### areHookImputsEqual
这个方法的作用是比较两个依赖项数组是否相同，采用的是浅比较。
相关代码如下：
```tsx

function areHookInputsEqual(
  nextDeps: Array<mixed>,
  prevDeps: Array<mixed> | null,
) { 
    
  if (prevDeps === null) { 
    return false;
  }

   
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    // 判断nextDeps[i], prevDeps[i] 是不是同一个引用的对象，也就是说，在内存中是不是同一个地址
    // 如果是，就继续下一个比较
    if (is(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}

```

##### pushEffect

这个方法的作用，是生成一个effect对象，然后推入到当前的单向链表里面

```ts
function pushEffect(tag, create, destroy, deps) {
  const effect: Effect = {
    tag,
    create,
    destroy,
    deps,
    // Circular
    next: (null: any),
  };
//  创建单向环状链表
  let componentUpdateQueue: null | FunctionComponentUpdateQueue = (currentlyRenderingFiber.updateQueue: any);
  
  if (componentUpdateQueue === null) {
    // 如果进入这个，说明是第一个effect
    // 下面这个方法会返回一个对象 return { lastEffect: null, stores: null, };
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    // 将这个对象在 Fiber.updateQueue 上保存
    currentlyRenderingFiber.updateQueue = (componentUpdateQueue: any);
    // 将effect 存储在 lastEffect上
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    // 当前的queue有多个，就说明不是第一个，存在多个effect
    // 拿到之前的effect
    const lastEffect = componentUpdateQueue.lastEffect;
    if (lastEffect === null) {
        // 如果没有，就和上面的if逻辑一样处理，将当前的effect存储到lastEffect上
      componentUpdateQueue.lastEffect = effect.next = effect;
    } else {
        // 1.如果之前有副作用，先把原本下一个的effect，放在firstEffect上 
      const firstEffect = lastEffect.next; 
    // 2. 将当前创建的effect 挂栽到上一个effect 的next 下，也就是让上一个，指向当前创建的effect上  
      lastEffect.next = effect; 
    //   3. 把原本是下一个effect的 对象，挂载到当前创建的effect 的下一项
      effect.next = firstEffect;
    //   最后将这个effect，挂栽到当前队列里，上一个effect上，实现链表的插入
      componentUpdateQueue.lastEffect = effect;
    }
  }
  return effect;
}

```

需要注意的是，在update的时候，即使effect deps 没有变化，也会创建对应的effect，这样才能保证effect数量和顺序是稳定的。
所以都会执行 pushEffect


---

### 2. 调度阶段 
调度阶段是 useEffect是独有的，因为回调函数会在commit阶段完成后，异步执行，因此需要调度阶段。
在commit阶段的三个子阶段开始之前，会执行如下的代码

```ts
if (
    (finishedWork.subtreeFlags & PassiveMask) !== NoFlags ||
    (finishedWork.flags & PassiveMask) !== NoFlags
  ) {
    if (!rootDoesHavePassiveEffects) {
      rootDoesHavePassiveEffects = true;
      pendingPassiveEffectsRemainingLanes = remainingLanes;
     
      pendingPassiveTransitions = transitions;
    //   scheduleCallback 来自 scheduler，用于某一优先级回调函数
      scheduleCallback(NormalSchedulerPriority, () => {
        // flushPassiveEffects 回调函数的具体方法，会执行对应的Effect
        flushPassiveEffects(); 
        return null;
      });
    }
  }
```

```ts
/** 用于在commit阶段，执行被标记为 passive的函数，比如 useEffect的回调函数。
 * 由于这些函数不会影响组件的渲染结果，所以可以延迟到渲染完成后再执行提高性能
 */ 
export function flushPassiveEffects(): boolean { 
    // 判断是否有待执行的 effect
  if (rootWithPendingPassiveEffects !== null) { 
    // 如果不为空，则执行 effect
    const root = rootWithPendingPassiveEffects; 
    const remainingLanes = pendingPassiveEffectsRemainingLanes;
    pendingPassiveEffectsRemainingLanes = NoLanes;

    // 优先级转换
    const renderPriority = lanesToEventPriority(pendingPassiveEffectsLanes);
    const priority = lowerEventPriority(DefaultEventPriority, renderPriority);
    const prevTransition = ReactCurrentBatchConfig.transition;
    const previousPriority = getCurrentUpdatePriority();

    try {
      ReactCurrentBatchConfig.transition = null;
      setCurrentUpdatePriority(priority);
      return flushPassiveEffectsImpl();
    } finally {
      setCurrentUpdatePriority(previousPriority);
      ReactCurrentBatchConfig.transition = prevTransition; 
      releaseRootPooledCache(root, remainingLanes);
    }
  }
  return false;
}

```
由于调度阶段的存在，为了保证一次的commit阶段执行前，上一次commit所调度的useEffect都已经执行过了，因此会在commit阶段的入口处，也会执行 flushPassiveEffects，而且是一个循环执行：

```ts
function commitRootImpl(
  root: FiberRoot,
  recoverableErrors: null | Array<CapturedValue<mixed>>,
  transitions: Array<Transition> | null,
  renderPriorityLevel: EventPriority,
) {
    // 注意，这里之所以用do-while循环，是为了保证上一轮调度的effect都执行过了
    do{
        flushPassiveEffects();
    }while(rootWithPendingPassiveEffects !== null)

}
```


### 3. 执行阶段

这三个effect 相关的 hook 执行阶段，有两个相关的方法

#### commitHookEffectListUnmount
用于遍历effect 链表，依次执行 effect.destory方法

```ts

function commitHookEffectListUnmount(
  flags: HookFlags,
  finishedWork: Fiber,
  nearestMountedAncestor: Fiber | null,
) {
  const updateQueue: FunctionComponentUpdateQueue | null = (finishedWork.updateQueue: any);
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & flags) === flags) {
        // Unmount
        // 从effect上拿到销毁函数
        const destroy = effect.destroy;
        // 再将destory置空
        effect.destroy = undefined;
        if (destroy !== undefined) {
          if (enableSchedulingProfiler) {
            if ((flags & HookPassive) !== NoHookEffect) {
              markComponentPassiveEffectUnmountStarted(finishedWork);
            } else if ((flags & HookLayout) !== NoHookEffect) {
              markComponentLayoutEffectUnmountStarted(finishedWork);
            }
          } 
         
          safelyCallDestroy(finishedWork, nearestMountedAncestor, destroy); 

          if (enableSchedulingProfiler) {
            if ((flags & HookPassive) !== NoHookEffect) {
              markComponentPassiveEffectUnmountStopped();
            } else if ((flags & HookLayout) !== NoHookEffect) {
              markComponentLayoutEffectUnmountStopped();
            }
          }
        }
      }
    //   继续下一个 effect
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}

```

#### commitHookEffecrtListMount
遍历effect链表，依次执行create方法，在声明阶段中，update会根据deps是否变化，打上不通的tag，之后在执行阶段就会根据是否有tag来决定是否要执行effect

```ts
export const NoFlags = /*   */ 0b0000;

// Represents whether effect should fire.
export const HasEffect = /* */ 0b0001;

// Represents the phase in which the effect (not the clean-up) fires.
export const Insertion = /*  */ 0b0010;
export const Layout = /*    */ 0b0100;
export const Passive = /*   */ 0b1000;

function commitHookEffectListMount(flags: HookFlags, finishedWork: Fiber) {
// 
}

```

由于 **commitHookEffectListUnmount** 会先于  **commitHookEffecrtListMount** 执行，因此每次都是先执行 **effect.destory**,再执行 **effect.create**

