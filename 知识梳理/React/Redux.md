
# 1. createStore 
1. 一个状态state用于存储状态
2. 一个监听器列表，当状态改变时，会遍历该列表，执行里面的所有方法
3. subscribe： 注册监听器
4. action : 有效载体，必须包含 action.type,以及额外数据
5. dispatch: 执行reducer(state,action) 遍历执行所有监听器（触发组件状态更新、从而引起页面重新渲染）
6. reducer ： 纯函数(state,action)=>  根据action.type 处理计算 =》 返回新状态


# 2. Redux 更新流程

1. 用户点了按钮，触发了 setState
2. setState 触发了 dispatch
3. dispatch 触发了 Action
4. Store 接受到 Action， 将Action和当前状态  传给了Reducer
5. Reducer 接受到 Action 和当前状态，返回了新的状态给Store
6. Store 接受新的状态，触发渲染

# 3. react-redux
1. Provider： 创建context，添加全局store
2. connect： 高阶组件
    * 通过context获取 redux store
    * 添加监听器，当通过dispatch更新状态时，执行该监听器，监听器将执行第一参数
        * 回调函数 state=> ({})  将返回值作为高阶组件的state
    * 将第二参数，使用 dispatch 进行包裹，返回新函数(...arg)=> dispatch(func(...agr))
    * 最后将state和封装后的方法，挂在到组件上

