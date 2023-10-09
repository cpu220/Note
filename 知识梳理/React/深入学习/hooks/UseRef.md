# useRef

# useRef 各个阶段
ref 是 reference的缩写，在React中，开发者可以通过ref保存一个对DOM的引用。

在React中，出现过3种ref引用模式
1. String类型
2. 函数类型
3. {current:T}

目前关于创建ref，类组件推荐使用 createRef方法，函数组件推荐使用 useRef方法。

```jsx
const refContainer = useRef(initialValue);

```

## mount阶段

调用的是mountRef，对应的代码如下：

```ts
function mountRef<T>(initialValue: T): {current: T} {
    const hook = mountWorkInProgressHook();
    const ref = {current:initialValue};

    hook.memoizedState = ref;
    return ref;
}
```

在mount阶段，首先调用mountWorkInProgressHook方法得到一个hook，该hook对象的memoizdeState上面会缓存一个键为current的对象 ，之后向外部返回这个对象

## update阶段

update阶段调用的是updateRef，对应代码如下：

```ts
function updateRef<T>(initialValue){
    const hook = updateWorkInProgressHook();
    return hook.memoizedState;
}


```

除了 useRef 以外，createRef也会创建相同数据结构的ref

```ts

function createRef (){
    const refObj = {
        current:null
    }
    return refObj
}

```

# ref 的工作流程
ref创建之后，会挂在 HostComponent 或者classComponent上面，形成ref props，例如

```jsx
// hostComponent
<div ref={domRef}></div>
// classComponent
<App  ref ={comRef} />
```

整个ref的工作流程分为两个阶段
- render 阶段：标记 ref flag
- commit 阶段：根据标记的ref flag，执行ref相关的操作


markRef 就是标记 ref flag 的方法，它会在render阶段调用，对应的代码如下：

```ts
function markRef(current,workInProgress){
    const ref = workInProgress.ref;
    if((current === null && ref !==null) || (current !==null && current.ref !== ref)){
        // ref flag
        workInProgress.flags != Ref;
    }
}

```

两种情况会标记ref

- mount阶段并且 ref props不为空
- update阶段并且ref props 发生了变化

标记完ref之后，来到了commit阶段，会在mutation子阶段执行 ref的删除操作，删除旧的ref

```ts
function commitMutationOnEffectOnFiber( finishedWork,root  ){
    if(flags & ref){
        const current = finishedWork.alternate;
        if(current !== null){
            // 移除旧的ref
            commitDetachRef(current);
        }
    }
}

```
上面的代码中，RcommitDetachRef 方法要做的事情就是移除旧的 ref

```ts

function commitDetachRef(current){
    const currentRef = current.ref;
    if(currentRef !== null){
        if(typeof currentRef === 'function'){
            // 函数类型 ref， 执行并传入null 作为参数
            currentRef(null);
        }else{
            // 对象类型 ref，将currentRef.current 置为null
            currentRef.current = null;
        }
    }
}

```

删除完成后，会在Layout子阶段重新赋值新的ref，对应的代码如下：

```ts

function commitLayoutEffectOnFiber(finishedRoot,current,finishedWork,committedLanes){
    if(finishedWork.flags & Ref){
        commitAttachRef(finishedWork);
    }
}
```

对应的 commitAttachRef 就是用来重新赋值ref的，

```ts

function commitAttachRef(finishedWork){
  const ref = finishedWork.ref;
  if(ref !== null){
    const instance = finishedWork.stateNode;
    let instanceToUse;
    switch(finishedWork.tag){
      case HostComponent:
        // HostComponent 需要获取对应的 DOM 元素
        instanceToUse = getPublicInstance(instance);
        break;
      default:
        // ClassComponent 使用 FiberNode.stateNode 保存实例
        instanceToUse = instance;
    }
    
    if(typeof ref === 'function'){
      // 函数类型，执行函数并将实例传入
      let retVal;
      retVal = ref(instanceToUse);
    } else {
      // { current: T } 类型则更新 current 指向
      ref.current = instanceToUse;
    }
  }
}

```

# ref 的失控
当我们使用ref保存对DOM的引用时，那么就有可能会造成ref的失控
所谓ref的失控，开发者通过ref操作了DOM，但是这一行为本来应该是由React接管的，两者产生了冲突，这种冲突就称之为ref的失控。

考虑下面这一段代码

## 案例一

```jsx

function App(){
    const inputRef = useRef(null);
    useEffect (()=>{
        inputRef.current.focus(); // 操作一
        inputRef.current.getBoundingClientRect();// 操作二
        inputRef.current.style.width = '500px';// 操作三
    })

    return (
        <div>
            <input ref={inputRef} />
        </div>
    )
}
 

```
上面的3个操作，分别是获取焦点，获取元素的位置，修改元素的宽度，这三个操作都是由React接管的，但是由于开发者使用了ref，导致这三个操作被开发者接管，这就是ref的失控。

其中操作3，并不能确定该操作是React的行为还是开发者的行为

## 案例二

```jsx

function App(){
  const [isShow, setShow] = useState(true);
  const ref = useRef(null);
  
  return (
    <div>
        <button onClick={() => setShow(!isShow)}>React操作DOM</button>
        <button onClick={() => ref.current.remove()}>开发者DOM</button>
        {isShow && <p ref={ref}>Hello</p>}
    </div>
  );
}

```

- 按钮一： 通过isShow来控制p标签是否显示
- 按钮二：通过ref直接拿到了p的DOM对象

由于两者是对同一个DOM进行操作，就会报错。

# ref失控的防治
ref失控的本质，是由于开发者通过ref操作了DOM，而这一行为本来应该是由React来进行接管的，两者之间发生了冲突而导致的。
因此，我们可以用两个方面来进行防止

- 防：控制ref失控的影响范围，使ref的失控更加容易被定位
- 治：从ref引用的数据结构入手，尽力避免可能引起的失控操作

## 防

在高阶组件内部，是无法将ref直接指向DOM的，我们需要进行ref的转发。可以通过forwardRef 进行一个ref的转发，将ref转发的这个操作，实际上就将ref失控的范围控制在了单个组件内，不会出现跨越组件的ref失控

由于是手动进行的ref转发，所以发生ref 失控的时候，更容易定位

## 治

使用useImperativeHandle, 它可以在使用ref时，向父组件传递自定义的引用值

```jsx

const myInput = forwardRef((props,ref)=>{
    const realInputRef = useRef(null);
    useImperativeHandle(ref,()=>({
        focus:()=>{
            realInputRef.current.focus();
        },
        getBoundingClientRect:()=>{
            return realInputRef.current.getBoundingClientRect();
        }
    }))
})
```

由于通过useImperativeHandle 来定制ref所引用的内容，那么外部开发者通过ref，只能拿到

```js
{
    foucus(){
        realInputRef.current.focus();
    }
}
```