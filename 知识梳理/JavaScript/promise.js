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
            this.#changeState(FULFILLED, data)
        }
        const reject = (error) => {
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
        this.#run()

    }

    // 微队列
    #funMicroTask(func) {
        setTimeout(func, 0)
    }

    // 统一回调封装
    #runCallBack(fn, resolve, reject) {
        this.#funMicroTask(() => {
            if (typeof fn === 'function') {
                // 1.回调是函数
                try {
                    const res = fn(this.#result)
                    //  返回的对象是否为promise
                    if (this.#isPromise) {
                        res.then(resolve, reject)
                    } else {

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

    }

    // 回调
    #run() {
        if (this.#state !== PENDING) { return }
        while (this.#handler.length) {
            const { onFulfilled, onReject, resolve, reject } = this.#handler.shift()
            if (this.#state === FULFILLED) {
                // 当前状态是完成
                this.#runCallBack(onFulfilled, resolve, reject)
            } else {
                // 当前状态是失败 
                this.#runCallBack(onReject, resolve, reject)

            }

        }
    }

    // 以下是对外api
    then(onFulfilled, onReject) {
        return new MyPromise((resolve, reject) => {

            this.#handler.push({
                onFulfilled,
                onReject,
                resolve,
                reject,
            })

            this.#run();


        })
    }

}

///
const p = new Promise((resolve, reject) => {
    // resolve(1)
    // reject(2)
})
