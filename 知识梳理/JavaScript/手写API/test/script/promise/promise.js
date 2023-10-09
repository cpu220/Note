const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECT = 'reject'


class MyPromise {
    #state = PENDING
    #result = undefined
    #handler = []

    constructor(fn) {
        const resolve = (data) => {
            // 如果状态被改变，则直接返回，说明结束
            console.log('resolve:', data)

            this.#changeState(FULFILLED, data)
        }
        const reject = (error) => {
            console.log('reject:', error)
            this.#changeState(REJECT, error)
        }

        try {
            fn(resolve, reject)
        } catch (error) {
            reject(error)
        }

    }
    // 以下是内部方法 
    #changeState(state, result) {
        if (this.#state !== PENDING) {
            return
        }

        this.#state = state
        this.#result = result
        console.log('changeState:', this.#state, this.#result)
        this.#run()

    }

    // 微队列
    #funMicroTask(func) {
        // node环境的微队列
        if (typeof process === 'object' && typeof process.nextTick === 'function') {
            console.log('进入node事件循环')
            process.nextTick(func)
        } else if (typeof MutationObServer === 'function') {
            // 浏览器环境的微队列
            console.log('进入浏览器事件循环')

            const obj = new MutationObServer(func)
            const textNode = document.createTextNode('1');
            obj.objserver(textNode, {
                characterData: true
            });
            textNode.data = '2'
        } else {
            // 微队列是环境，不是语言，所以除去浏览器和node环境，需要具体看
            console.log('进入setTimeout')
            setTimeout(func, 0)
        }

    }

    // 统一回调封装
    #runCallBack(fn, resolve, reject) {
        console.log('runCallBack:', fn, this.#state)
        this.#funMicroTask(() => {

            if (typeof fn === 'function') {
                // 1.回调是函数

                try {
                    const res = fn(this.#result)
                    //  返回的对象是否为promise
                    if (this.#isPromise(res)) {
                        console.log('回调是promise', res)
                        res.then(resolve, reject)
                    } else {
                        console.log('回调不是promise', res)

                        resolve(res)
                    }

                } catch (error) {
                    reject(error)
                }
            } else {
                // 2.回调不是函数，则根据状态，调用内置的函数返回

                const callback = this.#state === FULFILLED ? resolve : reject;
                callback(this.#result)
                return
            }




        })

    }

    // 判断是否为Promise对象
    #isPromise(obj) {
        console.log('isPromise:', obj)
        if (obj !== null &&
            (typeof (obj) === 'object' || typeof (obj) === 'function')
        ) {
            return typeof obj.then === 'function'
        }
        return false;
    }

    // 回调
    #run() {
        if (this.#state === PENDING) { return }
        while (this.#handler.length) {
            const { onFulfilled, onRejected, resolve, reject } = this.#handler.shift()
            if (this.#state === FULFILLED) {
                // 当前状态是完成
                this.#runCallBack(onFulfilled, resolve, reject)
            } else {
                // 当前状态是失败 
                this.#runCallBack(onRejected, resolve, reject)

            }

        }
    }

    // 以下是对外api
    then(onFulfilled, onRejected) {
        return new MyPromise((resolve, reject) => {

            this.#handler.push({
                onFulfilled,
                onRejected,
                resolve,
                reject,
            })

            this.#run();


        })
    }

}

// 测试1
const p = new MyPromise((resolve, reject) => {
    // resolve(1)
    // reject(2)
    setTimeout(() => {
        resolve(333)
    }, 0)
})

p.then(
    //    (res)=>{console.log(res)},
    null,
    (err) => {
        console.log(err)
        return 456
    }
).then((res) => {
    console.log('2', res)
})

//  测试2
// const p = new MyPromise((resolve, reject) => {
//     setTimeout(() => {
//         resolve(1)
//     }, 1000)
// })

// p.then((data) => {
//     console.log('ok1', data)
//     return new MyPromise((resolve)=>{
//         setTimeout(()=>{
//             resolve(data*2)
//         },1000)
//     })
// }).then((data)=>{
//     console.log('ok2',data)
//     return new MyPromise((resolve)=>{
//         setTimeout(()=>{
//             resolve(data*2)
//         },1000)
//     })
// }).then((data)=>{
//     console.log('ok3',data)
// })

// 测试3

setTimeout(() => {
    console.log(1)
}, 0)

new MyPromise((resolve, reject) => {
    resolve(2)
}).then((data) => {
    console.log('then', data)
})

console.log(3)