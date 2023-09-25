虚拟DOM

> The virtual DOM (VDOM) is a programming concept where an ideal, or “virtual”, representation of a UI is kept in memory and synced with the “real” DOM by a library such as ReactDOM. This process is called reconciliation.
> Vitual DOM 是一种编程概念。在这个概念里，UI以一种理想化的，或者说虚拟的表现形式被保存于内存中，并通过如ReactDOM等类库使之与【真实的】DOM同步。这一过程叫做协调

![What is the Virtual DOM?](https://legacy.reactjs.org/docs/faq-internals.html)

本质上，就是一个js对象，通过一个对象来描述每个DOM节点的特征，并且通过虚拟DOM，就能完整绘制出对应真实的DOM。

js通过 【@babel/preset-react】 ,将jsx转为  react.createElement()的形式，然后再转为虚拟DOM

```js
// 转换前
const ele = (
    <div className='xxx'>11</div>
)
console.log(ele)
```


```js
// 转换后

react.createElement(
    'div',
    {
        className: 'xxx'
    },
    '11'
)
```
 
## 优点

虚拟DOM的设计核心，就是用js操作，减少DOM操作，以此提升网页性能，然后使用diff算法对新旧的虚拟DOM，针对差异之处进行重新构建，更新视图，以此提高页面性能。

虚拟DOM让开发更关注业务逻辑而非DOM操作。所以也提高了开发的效率

1. 虚拟DOM本质上是一个对象，对其进行任何操作不会引起页面的绘制
2. 一次性更新，当页面频繁操作时，会导致多次绘制，而虚拟DOM会将多次操作合并为一次，然后再进行绘制。极大的提高了性能
3. 差异化更新，当状态改变时，构建新的虚拟DOM，然后使用diff算法对比，针对差异之处进行重新构建，更新视图。
4. 虚拟DOM的总损耗等于
    * 虚拟DOM 增删改 + diff 算法 + 真实DOM差异增删改 + 排版与重绘
5. 真实DOM操作的损耗是：
    * 真实DOM 完全增删改 + 排版与重绘
6. 跨平台
    * 本质上就是一种数据结构来描绘界面节点，借助虚拟DOM，所以就有了一套代码的跨平台

## 缺点
* 由于从虚拟DOM到真实DOM之间，还需要进行一些额外的计算，比如Diff，而这中间就多了一些消耗。对于一些简单的页面，肯定是不划算的。
* 首次渲染
    * 首次渲染需要将大量的DOM节点全部构建出来，并插入到页面中，这个过程需要额外的计算和操作，所以会慢
* 实用度
    * 虚拟DOM会在内存中额外维护一个虚拟树结构，用于表示页面的状态，增加一定的内存消耗

    

# 源码
```jsx
/**
 * Create and return a new ReactElement of the given type.
 * See https://reactjs.org/docs/react-api.html#createelement
 */
export function createElement(type, config, children) {
  let propName;

  // Reserved names are extracted
  const props = {};

  let key = null;
  let ref = null;
  let self = null;
  let source = null;

//  判断是否有属性=
  if (config != null) {
    if (hasValidRef(config)) {
      ref = config.ref;

       
    }
    if (hasValidKey(config)) {
       
      key = '' + config.key;
    }

    self = config.__self === undefined ? null : config.__self;
    source = config.__source === undefined ? null : config.__source;
    // Remaining properties are added to a new props object

    //  将所有属性放在props上
    for (propName in config) {
      if (
        hasOwnProperty.call(config, propName) &&
        !RESERVED_PROPS.hasOwnProperty(propName)
      ) {
        props[propName] = config[propName];
      }
    }
  }

  // Children can be more than one argument, and those are transferred onto
  // the newly allocated props object.

  // children可以有多个参数，
  // 如果是多个子元素，对应的事一个数组
  const childrenLength = arguments.length - 2; // 去掉type和config
  if (childrenLength === 1) {
    // 如果children是文本，就直接赋值
    props.children = children;
  } else if (childrenLength > 1) {
    const childArray = Array(childrenLength);
    for (let i = 0; i < childrenLength; i++) {
      childArray[i] = arguments[i + 2];
    }
     // 把参数被转移到新分配的props对象上
    props.children = childArray;
  }

  // Resolve default props
  if (type && type.defaultProps) {
    const defaultProps = type.defaultProps;
    for (propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }
  }
   
  return ReactElement(
    type,
    key,
    ref,
    self,
    source,
    ReactCurrentOwner.current,
    props,
  );
}
```

创建虚拟DOM 对象，也就是react 元素

```jsx

function ReactElement(type, key, ref, self, source, owner, props) {
  const element = {
    // This tag allows us to uniquely identify this as a React Element
    $$typeof: REACT_ELEMENT_TYPE,

    // Built-in properties that belong on the element
    type: type,
    key: key,
    ref: ref,
    props: props,

    // Record the component responsible for creating this element.
    _owner: owner,
  }; 

  return element;
}
```

> 虚拟DOM 和js对象之间的关系？
> 虚拟DOM是一种思想， JS对象是具体的实现方式