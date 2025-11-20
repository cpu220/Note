# lane模型
> react 为什么要从之前的 expirationTime 模型，改为 lane 模型？

## React 和 Scheduler 优先级的介绍
由于react团队打算把 Scheduler独立发布，所以在react内部，有一个粒度更细的优先级算法，这个就是lane模型。

在Scheduler内部，有5种优先级

```javascript
// 这里取了31位有符号整数的最大值，意思是永远不会过期
var maxSigned31BitInt = 1073741823; 
var IMMEDIATE_PRIORITY_TIMEOUT = -1;
// Eventually times out
var USER_BLOCKING_PRIORITY_TIMEOUT = 250;
var NORMAL_PRIORITY_TIMEOUT = 5000;
var LOW_PRIORITY_TIMEOUT = 10000;
// Never times out
var IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt;


```

作为一个独立的包，需要考虑到通用性，Scheduler 和 React 的优先级并不共通，在React内部，有四种优先级

```javascript
// packages/react-reconciler/src/ReactEventPriorities.new.js
export const DiscreteEventPriority: EventPriority = SyncLane;
export const ContinuousEventPriority: EventPriority = InputContinuousLane;
export const DefaultEventPriority: EventPriority = DefaultLane;
export const IdleEventPriority: EventPriority = IdleLane;


```

由于React中，不同的交互对应的**事件**回调中产生的Update会有不同的优先级，因此优先级与事件有关。因此在React内部的优先级也被称之为EventPriority

- DiscreteEventPriority
  - 对应离散事件，例如： click、focus、blur等事件都是离散触发的
- ContinuousEventPriority
  - 对应连续事件的优先级，例如：drag、mouseMove、scroll、touchMove等事件，都是连续触发的
- DefaultEventPriority
  - 对应默认的优先级，例如通过计时器周期性触发更新，这种情况下产生的Update不属于交互产生的Update，所以优先级是默认的优先级
- IdleEventPriority
  - 对应空闲情况的优先级

> 在上面的代码中，可以发现，不同级别的EventPriority对应不同的Lane，这就是Lane模型

## 优先级转换

既然React 和Scheduler 的优先级并不互通，所以就会涉及到一个转换的问题

### 1. Lane转换为EventPriority

```javascript
export function lanesToEventPriority(lanes: Lanes): EventPriority {
    // 用于分离出优先级最高的lanes
  const lane = getHighestPriorityLane(lanes);
  if (!isHigherEventPriority(DiscreteEventPriority, lane)) {
    return DiscreteEventPriority;
  }
  if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
    return ContinuousEventPriority;
  }
  if (includesNonIdleWork(lane)) {
    return DefaultEventPriority;
  }
  return IdleEventPriority;
}


```

### 2. EventPriority转换为Scheduler的优先级

```javascript  

let schedulerPriorityLevel;
switch (lanesToEventPriority(nextLanes)) {
    case DiscreteEventPriority:
    schedulerPriorityLevel = ImmediateSchedulerPriority;
    break;
    case ContinuousEventPriority:
    schedulerPriorityLevel = UserBlockingSchedulerPriority;
    break;
    case DefaultEventPriority:
    schedulerPriorityLevel = NormalSchedulerPriority;
    break;
    case IdleEventPriority:
    schedulerPriorityLevel = IdleSchedulerPriority;
    break;
    default:
    schedulerPriorityLevel = NormalSchedulerPriority;
    break;
}

```
 
### 案例

假设有一个点击事件，在onClick中对应有一个回调函数来触发更新。该更新属于 **DiscreteEventPriority** ，经过上面两套转换规则进行转换后，最终得到的Scheduler 对应的优先级就是 **ImmediateSchedulerPriority**


## Scheduler 的优先级转换React的优先级

相关转换的代码

```javascript
const schedulerPriority = getCurrentSchedulerPriorityLevel();
switch (schedulerPriority) {
    case ImmediateSchedulerPriority:
        return DiscreteEventPriority;
    case UserBlockingSchedulerPriority:
        return ContinuousEventPriority;
    case NormalSchedulerPriority:
    case LowSchedulerPriority:
        // TODO: Handle LowSchedulerPriority, somehow. Maybe the same lane as hydration.
        return DefaultEventPriority;
    case IdleSchedulerPriority:
        return IdleEventPriority;
    default:
        return DefaultEventPriority;
    }
 

```

在同一时间，可能存在很多的更新
- 从众多的优先级的Update中，选出一个优先级更高的
  - 本质就是排序
- 表达 **批** 的概念，例如：在同一时间，可能有多个连续事件触发，但是这些连续事件的优先级都是一样的，那么就可以把这些连续事件的Update放到同一个lane里面，这样就可以保证这些连续事件的Update都会被执行到


# expirationTime 模型
react早期采用的就是expirationTime算法，这一点和Scheduler里面的设计是一致的。

在Scheduler中，设计了5种优先级，不同的优先级会对应不同的timeout，最终会对应不同的 expirationTime, 然后task根据expirationTime来进行任务的排序

早期的时候，在React中延续了这种设计， Update的优先级与触发事件的当前时间以及优先级对应的延迟时间相关，这样的算法实际上是比较简单的。

每当进入Scheduler的时候，就会选出优先级最高的Update进行调度。但这种算法在表示 **批** 的概念上不够灵活

```javascript
const isUpdateIncludedInBatch = priorityOfUpdate >= priorityOfBatch
```
上面的代码中， priorityOfUpdate 表示的是当前Update的优先级， priorityOfBatch代表的是批对应的优先级下限，也就是说，当前的Update只要大于等于 priorityOfBatch ，就会被划分到同一批.
  - 所以没有办法将某一范围的几个优先级划为同一批

根本原因是，expirationTime模型优先级算法耦合了 **优先级** 和 **批** 的概念，限制了模型的表达能力。优先级算法的本质是为Update进行排序，但expirationTime模型在完成排序的同时还默认划定了 **批**


# lane 模型
因此，基于上述原因，React中引入了lane模型。新模型需要解决以下两个问题：

## 以优先级为依赖，对Update进行一个排序
 

针对第一个问题，lane模型中，设置了很多的lane，一个lane实际上是一个二进制来表达优先级，越低的位代表越高的优先级，例如：

```javascript

export const NoLanes: Lanes = /*                        */ 0b0000000000000000000000000000000;
export const NoLane: Lane = /*                          */ 0b0000000000000000000000000000000;

// 最高优先级
export const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000001;

export const InputContinuousHydrationLane: Lane = /*    */ 0b0000000000000000000000000000010;
export const InputContinuousLane: Lane = /*             */ 0b0000000000000000000000000000100;

export const DefaultHydrationLane: Lane = /*            */ 0b0000000000000000000000000001000;
export const DefaultLane: Lane = /*                     */ 0b0000000000000000000000000010000;
// 最低优先级
export const OffscreenLane: Lane = /*                   */ 0b1000000000000000000000000000000;
```

## 表达 **批**的概念

```javascript
let batch = 0
// 将laneA 和laneB 是不相邻的优先级
const laneA = 0b0000000000000000000000001000000
const laneB = 0b0000000000000000000000000000001

// 将laneA 纳入批中

batch |= laneA
// 将laneB 纳入批中
batch |= laneB

```

将laneB从batch中移除

```javascript
batch &= ~laneB

```

| (或运算)：用于合并多个 Lane。
& (与运算)：用于检查一个 Lane 是否存在于集合中，或两个集合是否有交集。
& ~ (与非运算)：用于从集合中清除一个特定的 Lane。




# 总结
在React中有一套粒度更细的优先级算法，这就是**lane模型**。 

这是一个基于位运算的算法，每一个lane是一个 32 bit integer， 不同的优先级对应了不同的lane，越低的位代表越高的优先级。

早期的React并没有使用lane模型，而是采用了基于 expirationTime 模型的算法。但这种算法耦合了**优先级**和**批**的概念，限制了模型的表达能力。优先级算法的本质是为 Update 排序，但expirationTime 模型在完成排序的同时还默认的划定了 **批**

所以，使用lane模型就不存在这个问题，因为是基于位运算，所以在批的划分上会更加的灵活。

