# Hook原理


# Hook的内部介绍
在react中，针对hook有三种策略，或者说三种类型的dispatch
1. HooksDispatcherOnMount
    - 负责初始化工作，让函数组件的一些初始化信息挂载到Fiber上面

```jsx
// 初始化的时候，会调用这个方法
// 关键词 mount （挂载）
const HooksDispatcherOnMount: Dispatcher = {
  // readContext: 读取Context值的函数，用于useContext和Context消费
  readContext,

  // use: React 18新增的Suspense并发原语，用于处理异步值
  use,
  
  // useCallback: 初始化记忆化回调函数的实现，返回一个记忆化的回调函数
  useCallback: mountCallback,  
  
  // useContext: 与readContext相同，用于读取Context值
  useContext: readContext, 
  
  // useEffect: 初始化副作用的实现，在组件挂载后执行
  useEffect: mountEffect,
  
  // useImperativeHandle: 初始化自定义ref暴露值的实现
  useImperativeHandle: mountImperativeHandle,
  
  // useLayoutEffect: 初始化布局副作用的实现，在DOM更新后同步执行
  useLayoutEffect: mountLayoutEffect,
  
  // useInsertionEffect: React 18新增，用于CSS-in-JS库的插入样式实现
  useInsertionEffect: mountInsertionEffect,
  
  // useMemo: 初始化记忆化值的实现，返回一个记忆化的值
  useMemo: mountMemo,
  
  // useReducer: 初始化状态管理器的实现，类似于Redux的状态管理
  useReducer: mountReducer,
  
  // useRef: 初始化ref对象的实现，返回一个可变的ref对象
  useRef: mountRef,
  
  // useState: 初始化状态的实现，返回状态值和更新函数
  useState: mountState,
  
  // useDebugValue: 开发环境下用于调试自定义Hook的实现
  useDebugValue: mountDebugValue,
  
  // useDeferredValue: React 18新增，用于延迟更新低优先级的值
  useDeferredValue: mountDeferredValue,
  
  // useTransition: React 18新增，用于标记状态更新为可中断的低优先级更新
  useTransition: mountTransition,
  
  // useSyncExternalStore: 用于订阅外部数据源的实现，保证状态同步性
  useSyncExternalStore: mountSyncExternalStore,
  
  // useId: React 18新增，生成唯一ID的实现，用于SSR和客户端一致性
  useId: mountId,
};

```

2. HooksDispatcherOnUpdate
    - 负责更新工作，让函数组件的一些更新信息挂载到Fiber上面

```jsx
// 更新的时候，会调用这个方法
// 关键词 update （更新）
const HooksDispatcherOnUpdate: Dispatcher = {
  readContext,

  use,
  useCallback: updateCallback,
  useContext: readContext,
  useEffect: updateEffect,
  useImperativeHandle: updateImperativeHandle,
  useInsertionEffect: updateInsertionEffect,
  useLayoutEffect: updateLayoutEffect,
  useMemo: updateMemo,
  useReducer: updateReducer,
  useRef: updateRef,
  useState: updateState,
  useDebugValue: updateDebugValue,
  useDeferredValue: updateDeferredValue,
  useTransition: updateTransition,
  useSyncExternalStore: updateSyncExternalStore,
  useId: updateId,
};

```

3. ContextOnlyDispatcher
    - 这个是和报错相关，防止开发者在函数组件外部调用Hook

``` jsx
// 当hook不是函数组件内部调用的时候，调用这个hooks对象下的hooks，所以报错
// 关键词， throw （抛出）
const ContextOnlyDispatcher: Dispatcher = {
  readContext,

  use,
  useCallback: throwInvalidHookError,
  useContext: throwInvalidHookError,
  useEffect: throwInvalidHookError,
  useImperativeHandle: throwInvalidHookError,
  useInsertionEffect: throwInvalidHookError,
  useLayoutEffect: throwInvalidHookError,
  useMemo: throwInvalidHookError,
  useReducer: throwInvalidHookError,
  useRef: throwInvalidHookError,
  useState: throwInvalidHookError,
  useDebugValue: throwInvalidHookError,
  useDeferredValue: throwInvalidHookError,
  useTransition: throwInvalidHookError,
  useSyncExternalStore: throwInvalidHookError,
  useId: throwInvalidHookError,
};

```

## 总结
mount阶段： 函数组件是进行初始化，那么此时调用的就是mountXXX对应的函数
update阶段： 函数组件是进行更新，那么此时调用的就是updateXXX对应的函数
其他场景下（报错）：此时调用的就是 throwInvalidHookError

> 注意：React会在开发环境下进行额外的检查，确保Hooks只在函数组件或自定义Hook内部调用。在生产环境中，这些检查会被移除以提高性能。

当FC（Function Component） 进入render流程的时候，首先会判断是初次渲染还是更新：

```jsx
ReactCurrentDispatcher.current =
      current === null || current.memoizedState === null
        ? HooksDispatcherOnMount
        : HooksDispatcherOnUpdate;

```

判断了是mount还是update之后，会给 ReactCurrentDispatcher.current 赋值对应的 dispatch，因为赋值了不同的上下文对象，因此就可以根据不同上下文对象，调用不同的方法。

假设有嵌套的hook：
```
useEffect(()=>{
    useState(0)
})
```
那么此时的上下文对象，指向ContextOnlyDispatcher，最终执行的就是 throwInvalidHookError ， 抛出错误


## 数据结构
```jsx

type Hook = {
  memoizedState: any, // 保存的状态
  baseState: any, // 初始状态或上一次渲染的最终状态
  baseQueue: UpdateQueue<any> | null, // 尚未处理的更新队列
  queue: UpdateQueue<any> | null, // 更新队列
  next: Hook | null, // 下一个hook，形成单向链表结构
};

```

值得注意的事，memoizedState字段，因为在FiberNode上面也有这么一个字段，与Hook对象上面的memoizedState存储的东西是不一样的
- FiberNode.memoizedState: 保存的是，Hook链表里面的第一个链表
- hook.memoizedState: 保存的是某个hook自身的数据
- 不同类型的hook，hook.memoizedState所存储的内容也是不同的
  
 
- useState: 对于const [state, updateState] = useState(initialState), memoizedState存储的是state
- useReducer: 对于const [state, dispatch] = useReducer(reducer, initialArg, init), memoizedState存储的是state
- useEffect： 对于useEffect(() => {}, deps), memoizedState存储的是包含callback、deps等信息的Effect对象
- useRef: 对于useRef(initialValue), memoizedState存储的是{current: initialValue}引用对象
- useMemo: 对于useMemo(() => {}, deps), memoizedState存储的是计算结果，而依赖项和工厂函数存储在内部结构中
- useCallback: 对于useCallback(() => {}, deps), memoizedState存储的是记忆化的回调函数，依赖项存储在其他字段中

> 依赖数组比较：React对useMemo、useCallback和useEffect的依赖数组进行浅比较（shallow comparison），通过Object.is()方法比较每个依赖项是否发生变化。
 


有些hook不需要memoizedState保存自身数据，比如useContext，它主要依赖于Context的订阅机制而不是自身状态存储。

> 注意：在React 18中，Hook对象还可能包含额外的字段，如`lanes`、`flags`等，用于优先级调度和标记系统。

# Hook 的一个执行流程
当FC进入到render阶段时，会被renderWithHooks函数处理执行

``` jsx

export function renderWithHooks<Props, SecondArg>(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: (p: Props, arg: SecondArg) => any,
  props: Props,
  secondArg: SecondArg,
  nextRenderLanes: Lanes,
): any {
  renderLanes = nextRenderLanes;
  currentlyRenderingFiber = workInProgress;

  
// 重置hook相关的全局变量
  resetHooks();
  
  // 每一次执行函数组件之前，先清空状态，用于存放hooks列表
  workInProgress.memoizedState = null; 
  // 清空状态队列，用于存放effect list
  workInProgress.updateQueue = null; 
  // lanes 优先级置为NoLanes
  workInProgress.lanes = NoLanes;
 
   
    // 根据当前的状态，判断是mount还是update
    ReactCurrentDispatcher.current =
      current === null || current.memoizedState === null
        ? HooksDispatcherOnMount
        : HooksDispatcherOnUpdate;
   
  const shouldDoubleRenderDEV =
    __DEV__ &&
    debugRenderPhaseSideEffectsForStrictMode &&
    (workInProgress.mode & StrictLegacyMode) !== NoMode;

  shouldDoubleInvokeUserFnsInHooksDEV = shouldDoubleRenderDEV;
  // 执行真正的函数组件，所有的hooks将依次执行
  let children = Component(props, secondArg);
  shouldDoubleInvokeUserFnsInHooksDEV = false;

  // Check if there was a render phase update
  if (didScheduleRenderPhaseUpdateDuringThisPass) {
    // Keep rendering until the component stabilizes (there are no more render
    // phase updates).
    children = renderWithHooksAgain(
      workInProgress,
      Component,
      props,
      secondArg,
    );
  }

  if (shouldDoubleRenderDEV) {
    // In development, components are invoked twice to help detect side effects.
    setIsStrictModeForDevtools(true);
    try {
      children = renderWithHooksAgain(
        workInProgress,
        Component,
        props,
        secondArg,
      );
    } finally {
      setIsStrictModeForDevtools(false);
    }
  }

    // 判断环境
  finishRenderingHooks(current, workInProgress, Component);

  return children;
}

```

``` js

function finishRenderingHooks<Props, SecondArg>(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: (p: Props, arg: SecondArg) => any,
): void {
   

   // 防止 hooks 在函数组件外部调用，如果调用，就直接报错
  ReactCurrentDispatcher.current = ContextOnlyDispatcher;

 
}


```

## 总结
- renderWithHooks 会被每次函数组件触发时（mount，update），该方法就会清空 workInProgress.memoizedState 和 workInProgress.updateQueue，然后根据当前的状态，判断是mount还是update
- 然后给 ReactCurrentDispatcher.current 赋值对应的 dispatch，因为赋值了不同的上下文对象，因此就可以根据不同上下文对象，调用不同的方法。
- 调用 Component 执行函数组件，组件里的hooks会依次执行


## 案例一 初始化
以useState为例，看看hooks是如何执行的

``` jsx

function App(){
    const [count ,setCount] = useState(0)
    return (
        <div onClick={(()=>{setCount(count+1)})} > {count}</div>
    )
}

```
接下来会根据是mount 还是update

### mount 阶段
1. 调用mountState,相关代码如下:


```jsx

function mountStateImpl<S>(initialState: (() => S) | S): Hook {
  // 1. 创建hook
  const hook = mountWorkInProgressHook();
  if (typeof initialState === 'function') {
    initialState = initialState();
  }
  // 2.1 设置 hook.memoizedState 、hook.baseState
  hook.memoizedState = hook.baseState = initialState;
  const queue: UpdateQueue<S, BasicStateAction<S>> = {
    pending: null,
    lanes: NoLanes,
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: (initialState: any),
  };
  // 2.2 设置 hook.queue
  hook.queue = queue;
  return hook;
}

function mountState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
    // 1. 创建hook
  const hook = mountStateImpl(initialState);
    // 2.2 获取queue
  const queue = hook.queue;
  // 2.3 设置hook.dispatch
  const dispatch: Dispatch<BasicStateAction<S>> = (dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    queue,
  ): any);
  queue.dispatch = dispatch;
  // 返回当前状态，dispatch函数
  return [hook.memoizedState, dispatch];
}

// 创建hook对象
function mountWorkInProgressHook(): Hook {
    // 初始化为null
  const hook: Hook = {
    memoizedState: null,

    baseState: null,
    baseQueue: null,
    queue: null,

    next: null,
  };

  // hook对象是要以链表形式串联起来，因此需要判断，当前的hook是否为链表的第一个
  if (workInProgressHook === null) {
    // This is the first hook in the list
    // 如果当前的组件hook链表为空，那么就将刚刚新建的hook作为链表的第一个节点（头节点）
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    // Append to the end of the list
    // 若不为空，则将刚新建的hook，挂载到hook链表的最后一个节点的next属性上（作为结尾）
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}


```



## 案例二 如果有多个hooks

### 正确的使用方式
 
``` jsx

function App({showNumber}){
    // let number,setNumber; 
    // showNumber && ( [number, setNumber] = React.useState(0));
    const  [number, setNumber] = React.useState(0)
    const [num,setNum] = React.useState(1);
    const dom = React.useRef(null);

    React.useEffect(()=>{
        console.log(dom.current)
    },[])

    return (
        <div ref = {dom}>
            <div onClick={ ()=>{setNumber(number+1)}}>{number}</div>
            <div onClick={ ()=>{setNum(num+1)}}>{num}</div>
        </div>
    )
}


```

当上面的函数组件，第一次初始化后，就会形成一个hook的链表

> FiberNode.memoizedState = workInProgressHook = hook1. useState   => memoizedState = 0 
> hook1.next = hook2. useState => memoizedState = 1 
> hook2.next = hook3. useRef => memoizedState = {current: null} 
> hook3.next = hook4. useEffect => memoizedState = {callback, deps} 
> workInProgressHook => 指向正在执行的，最新的hook


### 那么错误的方式，将hook 放在逻辑判断里

``` jsx
let number,setNumber; 
showNumber && ( [number, setNumber] = React.useState(0));
```

假设第一次父组件传递过来的 showNumber 为true，此时就会渲染第一个hook，第二次渲染的时候，假设父组件传递过来的是false，那么第一个hook就不会执行。此时就会出现链表不一致的情况，在复用的逻辑中，就会出现问题。

### 开发环境中的Hook调用顺序检查
在开发环境中，React会在渲染结束后验证所有Hooks的调用顺序是否与上一次渲染一致。如果不一致，将会抛出以下错误：

```
Error: Rendered fewer hooks than expected. This may be caused by an accidental early return statement.
```
或

```
Error: Rendered more hooks than during the previous render.
```

这些检查帮助开发者在开发阶段就发现潜在的问题。







## 案例三， update

### updateWorkInProgressHook 实现
``` jsx
/**
 * This function is used both for updates and for re-renders triggered by a render phase update. It assumes there is either a current hook we can clone, or a work-in-progress hook from a previous render pass that we can use as a base.
 */
 
function updateWorkInProgressHook(): Hook {

  let nextCurrentHook: null | Hook;
  if (currentHook === null) {
    // 从alternate上获取到 fiber 对象
    const current = currentlyRenderingFiber.alternate;
    if (current !== null) {
        // 拿到第一个 hook对象
      nextCurrentHook = current.memoizedState;
    } else {
      nextCurrentHook = null;
    }
  } else {
    // 拿到下一个hook
    nextCurrentHook = currentHook.next;
  }

  // 更新 workInProgressHook的指向,让 workInProgressHook 指向最新的 hook
  let nextWorkInProgressHook: null | Hook;
  if (workInProgressHook === null) {
    // 当前如果是第一个，直接从fiber 上获取第一个hook
    nextWorkInProgressHook = currentlyRenderingFiber.memoizedState;
  } else {
    // 如果不是，取当前链表的下一个 hook
    nextWorkInProgressHook = workInProgressHook.next;
  }

    // nextWorkInProgressHook 指向的是当前要工作的 hook   
  if (nextWorkInProgressHook !== null) {
    // There's already a work-in-progress. Reuse it.

    // 进行复用
    // 如果通过if条件增加或删除了hook，那么在复用的时候，会产生当前hook的顺序和之前hook的顺序不一致的问题。
    workInProgressHook = nextWorkInProgressHook;
    nextWorkInProgressHook = workInProgressHook.next;

    currentHook = nextCurrentHook;
  } else {
    // Clone from the current hook.

    if (nextCurrentHook === null) {
      const currentFiber = currentlyRenderingFiber.alternate;
      if (currentFiber === null) {
        // This is the initial render. This branch is reached when the component
        // suspends, resumes, then renders an additional hook.
        // Should never be reached because we should switch to the mount dispatcher first.
        throw new Error(
          'Update hook called on initial render. This is likely a bug in React. Please file an issue.',
        );
      } else {
        // This is an update. We should always have a current hook.
        throw new Error('Rendered more hooks than during the previous render.');
      }
    }

    currentHook = nextCurrentHook;

    const newHook: Hook = {
      memoizedState: currentHook.memoizedState, // hook 自身维护的状态

      baseState: currentHook.baseState, 
      baseQueue: currentHook.baseQueue,
      queue: currentHook.queue, // hook 自身维护的更新队列 
      next: null, // next指向一下一个hook
    };

    if (workInProgressHook === null) {
      // This is the first hook in the list.
      // 如果当前组件的hook链表为空，那么就将刚创建的newHook 作为链表的第一个节点

      currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
    } else {
      // Append to the end of the list.
      // 如果当前的组件 不为空， 那么就将刚刚新建的 hook 添加到hook的链表的末尾
      workInProgressHook = workInProgressHook.next = newHook;
    }
  }
  return workInProgressHook;
}
```

### updateState 实现

```jsx
function updateState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  return updateReducer(basicStateReducer, (initialState: any));
}

function updateReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: (I) => S,
): [S, Dispatch<A>] {
  const hook = updateWorkInProgressHook();
  const queue = hook.queue;
  
  // 标记这是一个 reducer 更新
  queue.lastRenderedReducer = reducer;

  // 处理待处理的更新队列
  const current: Hook = currentHook!;
  const pendingQueue = queue.pending;
  
  if (pendingQueue !== null) {
    // 处理所有待处理的更新
    const first = pendingQueue.next;
    let pending = pendingQueue.next;
    let newState = current.baseState;
    
    do {
      const action = pending.action;
      // 应用 reducer 计算新状态
      newState = reducer(newState, action);
      pending = pending.next;
    } while (pending !== first);
    
    // 更新状态
    hook.memoizedState = newState;
    hook.baseState = newState;
    queue.lastRenderedState = newState;
    
    // 清空待处理队列
    queue.pending = null;
  }
  
  const dispatch: Dispatch<A> = queue.dispatch;
  return [hook.memoizedState, dispatch];
}
```

从上面的update源码可以看得出来，如果hooks 放在了条件语句、循环等异步操作里。就会出现链表不一致的结果。那么react会报错

> 注意：在React 18中，添加了自动批处理机制，这意味着即使在setTimeout、Promise.then或自定义事件处理函数中调用setState，React也会尝试将多个状态更新批处理成一个渲染，从而提高性能。