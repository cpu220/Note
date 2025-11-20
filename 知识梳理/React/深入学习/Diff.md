# Diff 算法

React 在执行 render 过程中，会产生新的虚拟 DOM（Fiber Tree）。为了尽量减少浏览器中 DOM 的创建和修改，React 会对新旧虚拟 DOM 进行 Diff 对比，找出差异性。

## 核心概念

### Diff 是什么
- Diff 是指 **current FiberNode** 和 **JSX 对象** 之间的对比
- 对比后生成新的 **wip FiberNode**（Work In Progress Fiber Node）

### 时间复杂度优化
- 若采用完整的树对比算法，复杂度会达到 **O(n³)**（n 为元素数量）
- React 仅对 **同一层级** 的元素进行对比，将复杂度降低到 **O(n)**

---

# 1. Diff 策略

## 1.1 同级比较

### 核心规则
* React 仅对 **同一层级** 的元素进行对比，不会跨层级比较
* 树遍历一次即可完成 Diff 操作
* 跨层级移动节点会被视为：**删除旧节点 + 创建新节点**

### 对比依据
* 主要通过 **元素类型** 和 **key** 进行对比
* 若仅修改元素属性（如 className），不会重建元素，仅更新属性

---

# 2. 单节点 Diff

新节点为单一节点，旧节点数量不定。判断能否复用遵循以下流程：

## 2.1 复用判断流程

### 步骤 1：判断 key 是否相同
- 若更新前后未设置 key，则 key 为 `null`，被认为相同
- 若 key 相同，进入下一步判断
- 若 key 不同：
  - 当前 FiberNode 无法复用
  - 遍历兄弟 FiberNode，寻找可复用节点

### 步骤 2：判断 type 是否相同
- 若 type 相同：复用 FiberNode，仅更新 props
- 若 type 不同：
  - 当前 FiberNode 无法复用
  - 兄弟节点也会被标记为删除状态

## 2.2 案例分析

### 案例 1：无 key + type 不同
```html
<!-- 更新前 -->
<ul>
  <li>1</li>
  <li>2</li>
  <li>3</li>
</ul>

<!-- 更新后 -->
<ul>
  <p>1</p>
</ul>
```
- 无 key，视为 key 相同
- type 不同（li → p），无法复用
- 兄弟 FiberNode 均被标记为删除

### 案例 2：key 不同
```html
<!-- 更新前 -->
<div key="1">1</div>

<!-- 更新后 -->
<div key="2">2</div>
```
- key 不同，无需判断 type
- 旧节点直接被标记为删除

### 案例 3：key 相同 + type 相同
```html
<!-- 更新前 -->
<div key="1">1</div>

<!-- 更新后 -->
<div key="1">2</div>
```
- key 相同，type 相同
- 复用 FiberNode，仅更新 content

---

# 3. 多节点 Diff

新节点有多个时，进入多节点 Diff 流程。React 团队发现：**日常开发中，更新操作远多于增删移动**。

因此，多节点 Diff 分为两轮遍历：
1. 第一轮：逐个尝试复用节点
2. 第二轮：处理剩余未遍历的节点

## 3.1 第一轮遍历

### 遍历规则
从前往后依次遍历新旧子节点，存在三种情况：

1. **key 和 type 都相同**：复用节点，继续遍历

2. **key 相同但 type 不同**：
   - 根据新 JSX 创建全新 FiberNode
   - 旧 FiberNode 放入 `deletion` 数组，后续统一删除 (deletion数组，挂载在当前workInProgress FiberNode根节点上，全局就只有这么一个)
   - **遍历不会终止**，继续向后处理

3. **key 和 type 都不同**：**终止遍历**，进入第二轮

### 案例分析

#### 案例 1：key 不同导致提前终止
```html
<!-- 更新前 -->
<div>
  <div key="a">a</div>
  <div key="b">b</div>
  <div key="c">c</div>
  <div key="d">d</div>
</div>

<!-- 更新后 -->
<div>
  <div key="a">a</div>
  <div key="b">b</div>
  <div key="e">e</div>
  <div key="d">d</div>
</div>
```
- `key="a"` 和 `key="b"` 可复用
- 遇到 `key="e"` 时，与旧节点 `key="c"` 不同，终止第一轮遍历

#### 案例 2：key 相同但 type 不同
```html
<!-- 更新前 -->
<div>
  <div key="a">a</div>
  <div key="b">b</div>
  <div key="c">c</div>
  <div key="d">d</div>
</div>

<!-- 更新后 -->
<div>
  <div key="a">a</div>
  <div key="b">b</div>
  <p key="c">c</p>
  <div key="d">d</div>
</div>
```
- `key="a"` 和 `key="b"` 可复用
- `key="c"` 相同但 type 不同（div → p）：
  - 旧节点放入 `deletion` 数组
  - 根据新 JSX 创建 `<p>` 节点
  - 遍历继续，处理 `key="d"`

## 3.2 第二轮遍历

若第一轮遍历提前终止，进入第二轮处理剩余节点。

### 三种情况处理

#### 1. 只剩下旧子节点
- 将剩余旧节点 **全部放入 `deletion` 数组**，后续统一删除

#### 2. 只剩下新 JSX 元素
- 根据剩余新 JSX 元素 **创建新 FiberNode**

#### 3. 新旧子节点都有剩余
1. 将剩余旧 FiberNode 放入 **Map** 缓存（key 为节点的 key）
2. 遍历剩余新 JSX 元素：
   - 从 Map 中寻找可复用节点（key 和 type 都相同）
   - 若找到：复用节点
   - 若找不到：创建新节点
3. Map 中剩余的旧 FiberNode：放入 `deletion` 数组，后续统一删除

### 案例分析

#### 案例 1：只剩下旧子节点
```html
<!-- 更新前 -->
<div>
  <div key="a">a</div>
  <div key="b">b</div>
  <div key="c">c</div>
  <div key="d">d</div>
</div>

<!-- 更新后 -->
<div>
  <div key="a">a</div>
  <div key="b">b</div>
</div>
```
- 前 2 个节点可复用
- 剩余旧节点 `key="c"` 和 `key="d"` 放入 `deletion` 数组

#### 案例 2：只剩下新子节点
```html
<!-- 更新前 -->
<div>
  <div key="a">a</div>
  <div key="b">b</div>
</div>

<!-- 更新后 -->
<div>
  <div key="a">a</div>
  <div key="b">b</div>
  <div key="c">c</div>
  <div key="d">d</div>
</div>
```
- 旧节点遍历结束
- 剩余新节点 `key="c"` 和 `key="d"` 被创建

#### 案例 3：新旧子节点都有剩余
```html
<!-- 更新前 -->
<div>
  <div key="a">a</div>
  <div key="b">b</div>
  <div key="c">c</div>
</div>

<!-- 更新后 -->
<div>
  <div key="a">a</div>
  <div key="c">c</div>
  <div key="b">b</div>
</div>
```
- **第一轮遍历**：`key="a"` 可复用，`key="b"` 与新节点 `key="c"` 不同，终止
- **第二轮遍历**：
  1. 剩余旧节点 `key="b"`、`key="c"` 放入 Map
  2. 遍历剩余新节点 `key="c"`、`key="b"`：
     - 从 Map 中找到 `key="c"` → 复用
     - 从 Map 中找到 `key="b"` → 复用
  3. Map 中无剩余节点

---

# 4. 双端对比算法

双端对比算法是另一种 Diff 策略：
- 在新旧子节点数组中，各有两个指针指向头尾
- 依次向中间靠拢进行比较：
  1. 新前 vs 旧前
  2. 新后 vs 旧后
  3. 新后 vs 旧前
  4. 新前 vs 旧后
- 若匹配成功，更新指针（向中间移动）

## 4.1 为什么 React 不采用双端对比算法

### 官方注释解释
```javascript
// This algorithm can't optimize by searching from both ends since we
// don't have backpointers on fibers. I'm trying to see how far we can get
// with that model. If it ends up not being worth the tradeoffs, we can
// add it later.
```

### 核心原因

#### 1. **Fiber 节点没有反向指针**
Fiber 架构中，同一层级节点通过 `sibling` 属性连接，形成 **单向链表**，只能从左到右遍历，无法直接访问前一个节点。而双端对比算法需要同时从两端向中间遍历，实现复杂。

#### 2. **性能权衡**
React 团队认为：
- 大多数实际场景中，节点移动操作相对较少
- 双端对比算法的实现复杂性和性能开销可能超过其收益

#### 3. **其他优化手段**
React 采用 **Map 缓存剩余节点** 的方式处理移动操作，在大多数情况下已能提供良好性能。

### 重要说明
React 不采用双端对比算法 **不意味着** 其 Diff 效率低下。相反，React 通过 Fiber 架构和其他优化手段，在保证 UI 更新流畅性的同时，提供了高效的 Diff 对比机制。

---

# 总结

React Diff 算法通过以下策略实现高效对比：
1. **同级比较**：将复杂度降低到 O(n)
2. **key 机制**：提高节点复用率
3. **两轮遍历**：优化多节点场景
4. **单向链表**：简化 Fiber 架构实现

理解 Diff 算法有助于我们在开发中：
- 合理设置 key，提高性能
- 避免不必要的节点层级变动
- 写出更高效的 React 组件