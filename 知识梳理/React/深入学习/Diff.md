# Diff 算法

react在执行render过程中，会产生新的虚拟DOM (fiber tree)，在浏览器里，为了尽量减少DOM的创建，所以会对新旧DOM进行diff对比，找出差异性。
    
    - 这里的 diff，是指 current FiberNode 和 jsx 对象之间进行对比，然后生成新的 wip FiberNode （work In Progress Fiber Node）
    
    - diff算法本身是有性能上的消耗，在React文档中有提到，即便采用最前沿的算法，如果要完整的对比两棵树，那么算法的复杂度都会达到O(n^3)，n代表的是元素的数量。所以在实际的操作中，react会对比同一层级的元素，而不会跨层级对比，这样就可以将复杂度降低到O(n)


# 1. diff策略

1. 同级比较

* 考虑到在实际DOM操作中需要跨层级操作的次数较少，所以react只会对同级进行比较，不会跨层级比较。
* 所以diff操作时，只需要对树遍历一次就可以了。
    * 将一颗节点的子叶移到另一个节点下面，不会直接移动，而是删除后再创建。


* 主要是通过元素类型和key进行对比，所以className变更，只会修改className的属性，不会修改元素


## 单节点diff

新节点为单一节点，旧节点数量不一定
单节点diff是否能够复用，遵循一下流程
- 判断key是否相同
    - 如果更新前后没有设置key，那么key就是null，则被认为key相同
    - 如果key相同，就会进入下一步
    - 如果key不同，就无需判断type，结果直接为不能复用，如果有兄弟节点，还会去遍历兄弟节点
- 如果key相同，再判断type是否相同
    - 如果type相同，就复用
    - 如果type不同，无法复用，并且兄弟节点也一并标记为删除

### 案例一

更新前
``` html
<ul>
    <li>1</li>
    <li>2</li>
    <li>3</li>
</ul>

```

更新后
```html
<ul>
    <p>1</p>
</ul>

```

- 因为没有设置key，所以会被认为key相同，然后进入type的判断
- 发现type不同，所以无法复用
- 将兄弟元素fiberNode 标记为删除状态

如果key不同，只能代表当前的FiberNode 无法复用，因此还需要遍历兄弟的FiberNode，看是否有可以复用的

### 案例二

更新前
``` html
<div key="1">1</div>

```

更新后
``` html
<div key="2">2</div>

```
- 更新前后key不同，则不需要判断type，直接标记为删除


### 案例三

更新前
```html
<div key="1">1</div>

```

更新后
```html
<div key="1">2</div>

```

- 判断key相同，进入type判断
- 判断type也相同
- 复用FiberNode，只是更新了props


# 多节点diff
所谓多节点，指的是新节点有多个

React 团队发现，在日常开发中，对节点的操作中，更新情况多余节点的增、删、移动。因此在多节点diff的时候，会进行两轮遍历
- 第一轮遍历，会尝试逐个的复用节点
- 第二轮遍历处理上级一轮中，没有处理完的节点

## 第一轮遍历
第一轮遍历会从前往后依次遍历，存在三种情况
- 如果新旧子节点的key和type 都相同，说明可以服用
- 如果新旧子节点的key相同，但type不相同。
    - 这时候会根据ReactElement来生成一个全新的fiber
    - 旧的fiber被放入到deletion数组里面， 后面再统计以删除。
    - 注意的是，此时遍历不会终止
- 如果新旧子节点的key和type都不相同，结束遍历

### 案例一

更新前
```html
<div>
    <div key='a'>a</div>
    <div key='b'>b</div>
    <div key='c'>c</div>
    <div key='c'>d</div>
</div>
```

更新后
```html
<div>
    <div key='a'>a</div>
    <div key='b'>b</div> 
    <div key='e'>e</div> 
    <div key='d'>d</div>
</div>
```

- 先遍历到 div.key.a 发现该 fiber node 能够复用
- 继续往后走，发现 div.key.b 能够复用，继续往后走
- dev.key.e，发现key不同，因此第一轮遍历结束

### 案例二

更新前
```html
<div>
    <div key='a'>a</div>
    <div key='b'>b</div>
    <div key='c'>c</div>
    <div key='c'>d</div>
</div>
```

更新后
```html
<div>
    <div key='a'>a</div>
    <div key='b'>b</div> 
    <p key='c'>c</p> 
    <div key='d'>d</div>
</div>

```

- 先遍历到 div.key.a 发现该 fiber node 能够复用
- 继续往后走，发现 div.key.b 能够复用，继续往后走
- 发下第三个节点key相同，但是type不同
    - 将旧的fiber node 放入deletion数组，后面再统一删除
    - 根据新的react元素，创建一个新的fiber node
    - 但是此时的遍历不会结束的，会继续往后走


## 第二轮遍历
如果第一轮遍历背提前终止，那么就意味着有新的React元素以及旧的FiberNode没有遍历完，此时就会采用第二轮遍历。

第二轮会处理三种情况

1. 只剩下旧子节点：将旧的子节点添加到deletions数组里面直接删除（删除的情况）
2. 只剩下新的jsx元素：根据ReactElement 元素来创建FiberNode节点（西能的情况）
3. 新旧子节点都有剩余：
    - 会将剩余的FiberNode 节点放入一个map里面，遍历剩余的新的JSX元素，然后从map中寻找能够复用的FiberNode节点，如果能够找到，就拿来付佣金。（移动的情况）
    - 如果找不到，就新增。然后，如果剩余的JSX元素都遍历完了，map结构中还有剩余的Fiber节点，就将这些FIber节点添加到deletions数组里，之后统一删除。



### 只剩下旧子节点

更新前
```html
<div>
    <div key='a'>a</div>
    <div key='b'>b</div>
    <div key='c'>c</div>
    <div key='c'>d</div>
</div>
```

更新后
```html
<div>
    <div key='a'>a</div>
    <div key='b'>b</div> 
 
</div>
```

遍历前面2个节点，发现可以复用，就会复用前面的节点，对于React元素来讲，遍历完前面两个，就已经遍历结束，因此剩下的FiberNode就会被放入deletions 数组里面，之后统一删除


### 只剩下新子节点

更新前
```html
<div>
    <div key='a'>a</div>
    <div key='b'>b</div>
    
</div>
```

更新后
```html
<div>
    <div key='a'>a</div>
    <div key='b'>b</div> 
    <div key='c'>c</div>
    <div key='c'>d</div>
</div>
```

遍历完dev.key.b， 旧节点遍历结束，此时剩下的新节点，就会根据ReactElement来创建FiberNode节点 

### 新旧子节点都有剩余

更新前
```html
<div>
    <div key='a'>a</div>
    <div key='b'>b</div> 
    <div key='c'>c</div>
    <div key='c'>d</div>
    
</div>
```

更新后
```html
<div>
    <div key='a'>a</div>
    <div key='c'>c</div>
    <div key='b'>b</div> 
    <div key='c'>d</div>
</div>
```
- 第一轮遍历
    - dev.key.a 能够复用，然后下一个
    - dev.key.b  key 不一样，循环重点
- 第二轮遍历
    - 首先，会将剩余的旧的FiberNode放入到一个map里面
    - 遍历剩下的jsx 对象数组 ，遍历的同时，从map里面寻找能够复用的FiberNode节点
        - 如果能够找到，就拿来复用
        - 如果找不到，就新增
    - 如果整个jsx 对象数组遍历完，map里还有剩余的FiberNode节点，说明这些FiberNode是无法进行复用，直接放入deletions数组里面，后面统一删除


# 双端对比算法
指的是，在新旧子节点的数组中，各有两个指针指向头尾，然后依次向中间靠拢，进行比较。
- 在新子节点数组中，会有2个指针， nextStartIndex 和 nextEndIndex分别指向新子节点的头和尾
- 在旧节点数组中，也会有2个指针，oldStartIndex 和 oldEndIndex 分别指向旧子节点的头和尾

每遍历一次，就会尝试进行双端比较
    - 新前 vs 旧前
    - 新后 vs 旧后
    - 新后 vs 旧前
    - 新前 vs 旧后
如果匹配成功，更新双端指针（向中间移动）
    - 不是4次对比完成后移动，而是
    - 新前 vs 旧前 比对成功，则    nextStartIndex++ 、 在旧节点数组中，也会有2个指针，oldStartIndex++

# 为什么react 不采用双端对比算法


```
// 官方解释 位置在 packages/react-reconciler/src/ReactChildFiber.js
// reconcileChildrenArray  


// This algorithm can't optimize by searching from both ends since we
// don't have backpointers on fibers. I'm trying to see how far we can get
// with that model. If it ends up not being worth the tradeoffs, we can
// add it later.

// Even with a two ended optimization, we'd want to optimize for the case
// where there are few changes and brute force the comparison instead of
// going for the Map. It'd like to explore hitting that path first in
// forward-only mode and only go for the Map once we notice that we need
// lots of look ahead. This doesn't handle reversal as well as two ended
// search but that's unusual. Besides, for the two ended optimization to
// work on Iterables, we'd need to copy the whole set.

// In this first iteration, we'll just live with hitting the bad case
// (adding everything to a Map) in for every insert/move.

// If you change this code, also update reconcileChildrenIterator() which
// uses the same algorithm.

```