const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected' // 修改为标准的状态名称和常量名

/**
 * 创造一个微队列
 * 或者把传递的函数放到微队列中
 * @param {*} callback 
 */
function runMicrotask(callback) {
    // 先判断环境
    if (process && process.nextTick) {
        process.nextTick(callback)
    } else if (MutationObserver) {
        const p = document.createElement('p')
        const observer = new MutationObserver(callback)
        observer.observe(p, {
            childList: true
        })
        p.innerHTML = '1'
    } else {
        setTimeout(callback, 0)
    }
}

function isPromise(item) {
    return item && typeof item === 'object' && typeof item.then === 'function'
}

class MyPromise {
    /**
     * 构造器
     * 创建一个Promise
     * @param {*} executor  任务执行器，立即执行
     */
    constructor(executor) {
        this._state = PENDING
        this._value = undefined
        this._handles = [] // 处理队列
        try {
            executor(
                this._resolve.bind(this),
                this._reject.bind(this)
            )
        } catch (error) {
            this._reject(error)
        }

    }

    /**
     * 更改任务状态
     * @param {*} newState 
     * @param {*} newDate 
     */
    _changeState(newState, newDate) {
        if (this._state !== PENDING) {
            return
        }
        this._state = newState;
        this._value = newDate
        this._runHandlers()
    }

    /**
     * 
     * @param {*} executor 执行函数
     * @param {*} state 执行函数关联的状态
     * @param {*} resolve 让then 函数返回的 Promise 成功
     * @param {*} reject  让then 函数返回的 Promise 失败
     */
    _pushHandlers(executor, state, resolve, reject) {
        this._handles.push(
            {
                executor,
                state,
                resolve,
                reject
            }
        )
    }

    /**
     * 根据实际情况，执行队列
     * @returns 
     */
    _runHandlers() {
        if (this._state === PENDING) {
            // 说明任务仍在挂起
            return
        }
        while (this._handles[0]) {
            const item = this._handles[0]
            this._runOneHandles(item)
            this._handles.shift();
        }


    }

    /**
     * 处理一个handler
     * @param {*} handle 
     */
    _runOneHandles(handle) {


        runMicrotask(() => {
            // 当前 promise的状态，与队列中的状态不匹配
            if (this._state !== handle.state) {
                return
            }
            // 传递的可执行函数，并非 一个正常的函数
            if (typeof handle.executor !== 'function') {
                // 当promise的状态已经不是 挂起时，那么根据状态执行对应的 resolve和 reject，进行状态更改
                this._state === FULFILLED ? handle.resolve(this._value) : handle.reject(this._value)
            }

            try {
                // 执行对应函数
                const result = handle.executor(this._value)
                if (isPromise(result)) {
                    // 当执行的函数，返回的又是一个 promise时，那么就用then方案进一步执行
                    result.then(handle.resolve, handle.reject)
                } else {
                    // 当执行的函数不是一个 promise时，那么就直接 resolve 结果
                    handle.resolve(result)
                }
            } catch (error) {
                // 如果报错，直接进入 reject
                handle.reject(error)
                console.error(error)
            }
        })
    }
    /**
     * 
     * @param {*} onFulfilled 定义的，成功后执行的函数
     * @param {*} onRejected 失败后执行的函数
     */
    then(onFulfilled, onRejected) {


        return new MyPromise((resolve, reject) => {
            this._pushHandlers(onFulfilled, FULFILLED, resolve, reject)
            this._pushHandlers(onRejected, REJECTED, resolve, reject)
            this._runHandlers(); // 执行队列  ，因为有些任务是立即执行
        })
    }
    /**
        * 
        * @param {*} onRejected 
        */
    catch(onRejected) {
        return this.then(null, onRejected)
    }

    finally(onFinally) {
        return this.then((data) => {
            onFinally();
            return data
        }, (err) => {
            onFinally()
            throw err;
        })
    }
    /**
     * 标记当前任务完成 
     * @param {*} data  任务成功的相关数据
     */
    _resolve(data) {

        this._changeState(FULFILLED, data)
        // console.log('success', data)

    }
    /**
     * 标记当前任务失败
     * @param {*} err 任务失败的相关数据
     */
    _reject(err) {

        this._changeState(REJECTED, err)
        // console.log('fail', err)
    }

    static resolve(data) {
        if (data instanceof MyPromise) {
            return data
        }
        return new MyPromise((resolve, reject) => {
            if (isPromise(data)) {
                data.then(resolve, reject)
            } else {
                resolve(data)
            }
        })
    }

    static reject(err) {
        return new MyPromise((_, reject) => {
            reject(err)
        })
    }

    /**
     * 得到一个新的 promise
     * 该 promise的状态取决于 array 的执行，也就是第几个挂了，那么就直接返回结果，取第一个失败的原因
     * array可以是个数组，也可以是个迭代器 iterator
     * Promise 成功的结果，顺序是按照 传入的 array顺序排列
     * 只要有一个promise，则返回的promise失败。
     * @param {*} array 
     */
    static all(array) {

        return new MyPromise((resolve, reject) => {
            try {
                const result = [];
                let count = 0;
                let fulFilledCount = 0;

                for (const item of array) {
                    let i = count;
                    count++
                    console.log('count', count)
                    MyPromise.resolve(item).then((data) => {

                        fulFilledCount++
                        console.log('i', i)
                        result[i] = data
                        if (count === fulFilledCount) {

                            resolve(result)
                        }
                    }, reject)
                }
                if (count === 0) {
                    resolve(result)
                }
                console.log(count, fulFilledCount)
            } catch (error) {
                reject(error)
            }
            
        })

    }

    /**
     * 等待所有的 Promise有结果之后
     * 该方法返回的promise完成
     * 并且按照顺序将所有结果进行汇总返回
     * @param {*} array 
     */
    static allSettled(array){
        const  result = []
        for(const item of array){
            result.push(
                item.then(
                    value=>{
                        return {
                            status: FULFILLED,
                            value
                        }
                    },
                    err=>{
                        return {
                            status: REJECTED,
                            err
                        }
                    }
                )
            )
        }

        return  MyPromise.all(result)
    }
}




/////// 测试代码

// const p = new MyPromise((resolve, reject) => {
//     setTimeout(() => {
//         resolve(1333)
//     }, 0)
//     // throw new Error(123123) 
// })


// const p2 = p.then(data => {
//     console.log('p2.data', data)
//     return 12344
// }, err => {
//     console.log('err', err)
//     throw new Error(err)
// }).finally((d) => {
//     console.log('finally', d)
//     return 321312
// }).then((d) => {
//     console.log('finally2', d)
// })

// p2.then(
//     function A1(a) {
//         console.log('p2.A1', a);
//         return new Promise((resolve) => {
//             resolve(2)
//         })
//     },
//     function A2(v) { console.log('p2.A2', v); return v }
// ).then((a) => {
//     console.log('p2.A3', a * 10)
// })


// const p3 = MyPromise.resolve(1)
// console.log('p3',p3.then(a=>{console.log('p3',a)}))



const p1 = new MyPromise((resolve) => {
    setTimeout(() => {
        resolve(1)
    }, 1000)
})

const p4 = new MyPromise((resolve, reject) => {
    setTimeout(() => {
        reject(4)
    }, 900)
})
MyPromise.allSettled([
    p1,
    MyPromise.resolve(2),
    MyPromise.resolve(3),
    p4,

]).then((data) => {
    console.log('all.then', data)
}, (err) => {
    console.log('all.catch', err)
})