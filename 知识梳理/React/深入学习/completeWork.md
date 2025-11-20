# completeWork

当beginWork阶段完成后，就会进入completeWork阶段。

与beginwork类似，completeWork也会根据wip.tag 区分对待
流程上主要包括2个步骤

- 创建元素或者标记元素更新
- flags冒泡


## mount 阶段
在mount流程中，React会为不同类型的FiberNode创建对应的DOM元素：
- 对于HostComponent（如div、span等），会调用createInstance创建DOM元素
- 对于HostText，会调用createTextInstance创建文本节点

```jsx
function createInstance(type,props,rootContainerInstance,hostContext ,internalInstancehandle   ){
  
  if( typeof props.children === 'string' || typeof props.children === 'number'){
    return document.createTextNode(props.children)
  }

  const domElement = createDOMElement(type,props,rootContainerInstance,hostContext ,internalInstancehandle   )

  return domElement;
}

// HostText 创建文本节点
function createTextInstance(text, rootContainerInstance) {
  return document.createTextNode(text);
}
```

接下来会执行appendAllChildren方法，将所有子DOM元素挂载到父DOM元素上。这个方法会遍历当前FiberNode的所有子节点，并将它们对应的DOM元素附加到父DOM元素上：

```jsx
function appendAllChildren(parent,workinProgress,...){
 let node = workInProgress.child;
 while(node){
    // 步骤 1： 向下遍历，对第一层DOM 元素执行 appendChild
   if(node.tag === HostComponent || node.tag === HostText){
    // 对 HostComponent 或 HostText 元素执行 appendChild
     appendInitialChild(parent,node.stateNode)
   }else if(node.child !== null){
    // 继续向下遍历，直到找到第一层DOM元素类型
    
    node.child.return = node;
    node = node.child;
    continue;
   }

// 终止情况 1： 遍历到parent 对应的 FiberNode
   if(node === workInProgress){
    return ;
   }

// 如果没有兄弟 FiberNode，则向父 FiberNode 遍历
   while(node.sibling === null){
    // 终止情况 2： 回到最初执行步骤 1 所在层
    if(node.return === null || node.return === workInProgress){
      return;
    }
    node = node.return;
   }
   // 对兄弟 FiberNode 执行步骤1
   node.sibling.return = node.return;
   node = node.sibling;
 }
}

// 辅助函数：将子DOM元素附加到父DOM元素
function appendInitialChild(parent, child) {
  parent.appendChild(child);
}
```

appendAllChildren 方法实际上就是在处理下一级DOM元素，而且，在appendAllChildren里面的遍历过程会更加复杂一些，会多一些判断
因此 FiberNode最终形成的FiberNodeTree的层次和最终DOMTree的层次是有区别的


```jsx
function World() {
    return <span>World</span>
}

// 在组件中渲染
<div>
    Hello
    <World />
</div>
```

从FiberNode树的角度看，"Hello"（HostText类型）和World组件是同级的兄弟节点；但从最终渲染的DOM树角度看，"Hello"和World组件返回的<span>World</span>是同级的DOM节点。

这是因为React会将组件的返回值展开并插入到DOM树中，所以FiberNode树的层次结构可能会比DOM树更复杂。


在创建DOM元素并附加子元素后，completeWork会执行finalizeInitialChildren方法完成DOM元素的属性初始化，主要包括：

- styles：通过setValueForStyle设置元素样式
- innerHTML：设置元素的innerHTML
- 文本内容：对于HostText类型，设置其文本内容
- 非冒泡事件：如cancel、close、invalid、load、scroll、toggle等，通过listenToNonDelegatedEvent监听
- 其他属性：如id、class、title等

该方法执行完毕后，会进行flags冒泡处理。


总结：

1. 根据wip.tag 进入不同的处理分支
2. 根据 current !== null 来判断是mount 还是 update 流程
3. 对应 HostComponent，首先执行 createInstance 方法创建DOM元素
4. 对应 HostText，直接执行 setTextContent 方法设置文本内容
5. 执行 appendChildren 将下一级DOM元素挂载在上一步所创建的DOM元素下
6. 执行 finalizelnitialChildren 方法完成属性的初始化
7. 执行 bubbleProperties完成  flags 冒泡


## update阶段

mount流程完成的是DOM元素的创建和属性初始化，而update流程则是处理属性的更新。

对于HostComponent，update阶段的主要逻辑是在diffProperties方法中，这个方法会包含两次遍历：
- 第一次遍历旧属性，标记更新前有而更新后没有的属性（需要删除的属性）
- 第二次遍历新属性，标记更新前后有变化的属性（需要更新的属性）
该方法会比较新旧属性并标记需要更新的内容：

```jsx
function diffProperties(current, workInProgress, type, oldProps, newProps) {
  const updatePayload = [];
  
  // 遍历旧属性，标记需要删除的属性
  for (const propName in oldProps) {
    if (!(propName in newProps)) {
      // 记录需要删除的属性
      updatePayload.push(propName, null);
    }
  }

  // 遍历新属性，标记需要更新的属性
  for (const propName in newProps) {
    const oldPropValue = oldProps[propName];
    const newPropValue = newProps[propName];

    if (oldPropValue !== newPropValue) {
      // 记录需要更新的属性和新值
      updatePayload.push(propName, newPropValue);
    }
  }
  
  // 将更新 payload 保存到 workInProgress 的 updateQueue 中
  workInProgress.updateQueue = updatePayload;
  
  // 如果有需要更新的属性，标记当前 FiberNode
  if (updatePayload.length > 0) {
    workInProgress.flags |= Update;
  }
}
```

React会将需要更新的属性以数组形式（如['title', '1', 'style', {color: '#111'}]）保存到FiberNode的updateQueue中，等待后续在commit阶段执行实际的DOM更新。


```jsx
export default () => {
  const [number, setNumber] = useState(0);
  return (
    <div
      onClick={() => setNumber(number + 1)}
      style={{ color: `#${number}${number}${number}` }}
      title={number.toString()}
    ></div>
  );
}
```

当点击div触发更新时，执行流程如下：

1. React调用setNumber更新state，触发重新渲染
2. 在beginWork阶段处理div元素，发现需要更新
3. 调用diffProperties方法比较新旧属性，生成updatePayload
4. 在completeWork阶段，将updatePayload保存到div的FiberNode.updateQueue中
5. 标记div的FiberNode为Update
6. 执行flags冒泡，将Update标志向上冒泡
7. 所有更新完成后，进入commit阶段
8. 在commit阶段，React会遍历带有Update标记的FiberNode，并根据updateQueue中的内容执行实际的DOM更新
9. 完成DOM元素的更新




## flags冒泡

当整个Reconciler完成工作后，会得到一棵完整的workInProgress（wip）FiberNode树。这棵树中的一些FiberNode被标记了flags（副作用标记），另一些则没有。

为了高效地找到树中所有带有flags的节点，React采用了flags冒泡机制。冒泡过程是自下而上的，每个FiberNode会收集其子树中所有的flags：

```jsx
let subtreeFlags = NoFlags;

// 收集子FiberNode的子孙FiberNode中标记的flags
subtreeFlags |= child.subtreeFlags;

// 收集子FiberNode本身标记的flags
subtreeFlags |= child.flags;

// 将收集到的所有flags附加到当前FiberNode的subtreeFlags上
workInProgress.subtreeFlags |= subtreeFlags;
```

这种收集方式的好处是，在后续的渲染阶段，可以通过任意一级FiberNode的subtreeFlags快速确定该节点及其子树是否存在副作用相关的操作，提高了效率。

早期的React并没有使用subtreeFlags，而是使用effect list链表来收集副作用。使用subtreeFlags的优势在于能更快速地确定某一节点的子树是否存在副作用。