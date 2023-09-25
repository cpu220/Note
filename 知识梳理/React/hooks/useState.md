# useState

> useState和useReducer的区别

## 基本用法

```jsx
import { useState } from 'react';

const initialState = {count:0}

/** 
 * @param {object} state 状态
 * @param {object} action 数据变化的描述对象
 */
function counter(state,action){
     const _num = action.payload
    switch(action.type){
        case 'increment':
            return {count:state.count+_num}
        case 'decrement':
            return {count:state.count-_num}
        default:
            throw new Error();
    }
}

// 惰性初始化函数
function init(initialState){
    // 有些时候，我们需要基于之前初始化状态做一些操作，返回新的处理后的初始值
    // 重新返回新的初始化状态
    return {count: initialState.count + 1}
}

function App(){
    const [num,setNum] = useState(0);
    const [state,dispatch] = useReducer(counter,initialState,init)

    const increment = ()=>{
        dispatch({
            type:'increment',
            payload:num
        })
    }

    const decrement = ()=>{
        dispatch({
            type:'decrement',
            payload:num
        })
    }

    return (
        <div>
            <p>{num}</p>
            <div>{count}<div>
            <button onClick={()=>setNum(num+1)}>+</button>
            <button onClick={increment}>increment</button>
            <button onClick={increment}>decrement</button>
        </div>
    )
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

function mountStateImpl<S>(initialState: (() => S) | S): Hook {
    //1. 拿到hook 对象
  const hook = mountWorkInProgressHook();
  if (typeof initialState === 'function') {
    // 2. 如果传入的值是函数，则执行函数获取初始值 （惰性函数）
    initialState = initialState();
  }
 
 // 3. 将初始值保存到hook对象的 memoizedState和baseState上
  hook.memoizedState = hook.baseState = initialState;

  const queue: UpdateQueue<S, BasicStateAction<S>> = {
    pending: null,
    lanes: NoLanes,
    dispatch: null,
    lastRenderedReducer: basicStateReducer, // 注意这里，和 mountReducer的区别 
    lastRenderedState: (initialState: any),
  };
  // 3.1设置 hook.queue
  hook.queue = queue;
  
// dispatch 就是用来修改状态的方法
  const dispatch: Dispatch<BasicStateAction<S>> = (dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    queue,
  ): any);
  queue.dispatch = dispatch;
  // 返回当前状态，dispatch函数
  return [hook.memoizedState, dispatch];

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
