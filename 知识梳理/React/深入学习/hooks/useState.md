# useState

> useState和useReducer的区别与React 18.x特性分析

## 基本用法

```jsx
import { useState, useReducer } from 'react';

const initialState = {count: 0}

/** 
 * @param {object} state 状态
 * @param {object} action 数据变化的描述对象
 */
function counter(state, action){
    const _num = action.payload;
    switch(action.type){
        case 'increment':
            return {count: state.count + _num};
        case 'decrement':
            return {count: state.count - _num};
        default:
            throw new Error(`Unknown action type: ${action.type}`);
    }
}

// 惰性初始化函数
function init(initialState){
    // 有些时候，我们需要基于之前初始化状态做一些操作，返回新的处理后的初始值
    // 重新返回新的初始化状态
    return {count: initialState.count + 1};
}

function App(){
    const [num, setNum] = useState(0);
    const [state, dispatch] = useReducer(counter, initialState, init);

    const increment = () => {
        dispatch({
            type: 'increment',
            payload: num
        });
    };

    const decrement = () => {
        dispatch({
            type: 'decrement',
            payload: num
        });
    };

    return (
        <div>
            <p>useState: {num}</p>
            <div>useReducer: {state.count}</div>
            <button onClick={() => setNum(num + 1)}>+</button>
            <button onClick={increment}>increment</button>
            <button onClick={decrement}>decrement</button>
        </div>
    );
}

```

```jsx

const [state,dispatch] = useReducer(
    reducer, // reducer函数
    initialState, // 初始值
    init, // 初始化函数
    )

```
 

## mount 阶段

### useState 的 mount 阶段
``` tsx

function mountState<S>(initialState: (() => S) | S): [S, Dispatch<BasicStateAction<S>>] {
    // 1. 创建一个新的 hook 对象
    const hook = mountWorkInProgressHook();
    
    // 2. 处理惰性初始化
    if (typeof initialState === 'function') {
        // 如果传入的值是函数，则执行函数获取初始值（惰性初始化）
        initialState = initialState();
    }
 
    // 3. 将初始值保存到 hook 对象的 memoizedState 和 baseState 上
    hook.memoizedState = initialState;
    hook.baseState = initialState;
    hook.baseQueue = null;
    
    // 4. 创建更新队列
    const queue: UpdateQueue<S, BasicStateAction<S>> = {
        pending: null,
        lanes: NoLanes,
        dispatch: null,
        // useState 使用内置的 basicStateReducer
        lastRenderedReducer: basicStateReducer,
        lastRenderedState: initialState,
    };
    
    // 6. 创建 dispatch 函数
  const dispatch: Dispatch<BasicStateAction<S>> = (queue.dispatch = (dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    queue,
  ): any));
  
  // 7. 返回当前状态和 dispatch 函数
  return [hook.memoizedState, dispatch];
}

// React 18.x 中 dispatchSetState 的核心逻辑大致如下：
function dispatchSetState<S>(
  fiber: Fiber,
  queue: UpdateQueue<S, BasicStateAction<S>>,
  action: BasicStateAction<S>,
) {
  // 获取当前 lane (React 18 中的优先级模型)
  const lane = requestUpdateLane(fiber);
  
  // 创建更新对象
  const update = { lane, action, hasEagerState: false, eagerState: null, next: null };
  
  // 尝试优化：如果当前状态可以立即计算，尝试提前计算
  const currentState = queue.lastRenderedState;
  if (typeof action === 'function') {
    // 函数式更新需要基于当前状态
    update.eagerState = action(currentState);
    update.hasEagerState = true;
  }
  
  // 将更新加入队列
  enqueueUpdate(fiber, queue, update);
  
  // 调度更新 (在 React 18 中会自动批处理)
  scheduleUpdateOnFiber(fiber, lane);
}

```

### useReducer 的 mount 阶段

``` tsx

function mountReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: I => S,
): [S, Dispatch<A>] {
    // 1. 创建hook
  const hook = mountWorkInProgressHook();
  let initialState;
  if (init !== undefined) {
    // 1.1 如果有init 初始化函数，就执行该函数
    initialState = init(initialArg);
  } else {
    // 1.2 没有就直接使用初始值
    initialState = ((initialArg: any): S);
  }
// 1.3 将initialState 保存到hook对象的 memoizedState和baseState上
  hook.memoizedState = hook.baseState = initialState;
  // 2. 创建 queue 对象
  const queue: UpdateQueue<S, A> = {
    pending: null,
    lanes: NoLanes,
    dispatch: null,
    lastRenderedReducer: reducer, // 注意这里，这是传入进来的 reducer
    lastRenderedState: (initialState: any),
  };
  hook.queue = queue;
    // 3. dispatch 就是用来修改状态的方法
  const dispatch: Dispatch<A> = (queue.dispatch = (dispatchReducerAction.bind(
    null,
    currentlyRenderingFiber,
    queue,
  ): any));
// 4. 向外部返回初始值 和 dispatch
  return [hook.memoizedState, dispatch];
}

```

### 总结
- useState 和 useReducer 的 mount 阶段，都是通过创建hook对象，然后将初始值保存到hook对象的 memoizedState和baseState上，然后创建 queue 对象，最后返回初始值 和 dispatch
- 但有一个区别
    - mountState 的 queue里面的 lastRenderReducer对应的事 basicStateReducer，
    - 而mountReducer的queue里面 的lastRenderedReducer 对应的事开发者自己传入的reducer函数

所以，useState的本质就是useReducer的简化版本，只不过在useState内部，会有一个内置的 reducer


basicStateReducer 的对应代码
``` tsx
function basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
  // $FlowFixMe[incompatible-use]: Flow doesn't like mixed types
  return typeof action === 'function' ? action(state) : action;
}
```


## update 阶段

### useState 的 update 阶段

``` tsx

function updateState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  return updateReducer(basicStateReducer, initialState);
}


```  

### useReducer 的 update 阶段

``` tsx

function updateReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: I => S,
): [S, Dispatch<A>] {
    // 获取对应的hook对象
  const hook = updateWorkInProgressHook();
  //  根据update链表计算state的逻辑
//   最后返回  return [hook.memoizedState, dispatch];
  return updateReducerImpl(hook, ((currentHook: any): Hook), reducer);
}

```

## 总结

> useState 本质上就是一个 简易版的 useReducer 

> 在mount阶段，两者的区别就在于
1. useState 的 lastRenderedReducer为 basicStateReducer,
2. useReducer的 lastRenderedReducer 为开发者传入的 reducer
  
所以，useState可以视为 reducer 参数为 basicStateReducer 的 useReducer 

> 在update阶段，updateState 内部直接调用的就是 updateReducer，传入的reducer仍然是 basicStateReducer

## React 18.x 的新特性

### 1. 自动批处理 (Automatic Batching)

在 React 18 之前，只有在 React 事件处理函数中的状态更新才会被批处理。在 React 18 中，所有的状态更新（包括 Promise、setTimeout、原生事件处理函数等）都会自动进行批处理。

```jsx
// React 18 之前 - 会触发两次渲染
fetchData().then(() => {
  setCount(c => c + 1); // 触发一次渲染
  setFlag(f => !f); // 触发一次渲染
});

// React 18 中 - 只会触发一次渲染
fetchData().then(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // 这两个更新会被批处理，只触发一次渲染
});
```

### 2. 显式批处理 (flushSync)

如果需要在某些情况下不进行批处理，可以使用 `flushSync`：

```jsx
import { flushSync } from 'react-dom';

function handleClick() {
  flushSync(() => {
    setCounter(c => c + 1);
  });
  // 此时状态已经更新并渲染完成
  flushSync(() => {
    setFlag(f => !f);
  });
}
```

### 3. 并发模式下的状态更新

在 React 18 的并发模式中，状态更新可能会被中断、暂停、恢复或放弃。useState 的更新行为需要考虑这些新的场景：

#### useTransition

对于非紧急更新，可以使用 `useTransition` 将其标记为可中断的：

```jsx
import { useState, useTransition } from 'react';

function List({ items }) {
  const [filter, setFilter] = useState('');
  const [isPending, startTransition] = useTransition();
  
  function handleChange(e) {
    // 紧急更新：立即更新输入框
    setFilter(e.target.value);
    
    // 非紧急更新：在后台计算并更新列表，可能会被中断
    startTransition(() => {
      // 过滤列表的逻辑
    });
  }
}
```

### 4. 优先级模型的变化

React 18 使用了新的优先级模型 (Lane Model)，来更好地处理并发更新。在 useState 的更新中，每个更新都会被分配一个 lane，表示其优先级。

## 常见错误与最佳实践

### 1. 状态更新的异步性

记住，React 的状态更新是异步的：

```jsx
// 错误示例
function handleClick() {
  setCount(count + 1);
  console.log(count); // 输出的仍是旧值，不是更新后的值
}

// 正确示例
function handleClick() {
  setCount(c => c + 1); // 使用函数式更新
  // 或者在 useEffect 中访问更新后的值
  useEffect(() => {
    console.log(count);
  }, [count]);
}
```

### 2. 避免在渲染过程中更新状态

不要在组件的渲染阶段直接更新状态，这会导致无限循环：

```jsx
// 错误示例
function Component() {
  const [count, setCount] = useState(0);
  setCount(count + 1); // 会导致无限循环
  return <div>{count}</div>;
}

// 正确示例
function Component() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(count + 1); // 在副作用中更新
  }, []);
  return <div>{count}</div>;
}
```

### 3. 对象和数组的不可变性

更新对象或数组状态时，总是创建新的副本，而不是修改原对象：

```jsx
// 错误示例
function handleClick() {
  user.name = 'New Name'; // 直接修改对象
  setUser(user); // 不会触发重新渲染
}

// 正确示例
function handleClick() {
  setUser(prevUser => ({ ...prevUser, name: 'New Name' })); // 创建新对象
}
```

## 输入输出示例

#### 输入输出示例
输入：
```jsx
const [count, setCount] = useState(0);
setCount(prevCount => prevCount + 1);
setCount(prevCount => prevCount + 1);
```

输出：
```jsx
// 最终 count 的值为 2，因为两次更新都被正确应用了
// 这是因为函数式更新保证了基于最新状态进行更新
```

输入：
```jsx
const [count, setCount] = useState(0);
setCount(count + 1);
setCount(count + 1);
```

输出：
```jsx
// 最终 count 的值为 1，因为两次更新都使用了相同的初始值 0
// 非函数式更新在批处理中可能会有此问题
