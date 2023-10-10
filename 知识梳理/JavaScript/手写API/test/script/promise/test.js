const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJEECTED = 'rejected'

// new Promise((resolve, reject) => {
//     setTimeout(() => {
//         resolve(data)
//         reject(err)
//     }, 0)

// }).then(
//     (data) => { },
//     (error) => { }
// )


class MyPromise {
    #state = PENDING;
    #result = undefined
    #task = []
    constructor(fn) {
        const resolve = (data) => {
            this.#chageState(FULFILLED, data)

        }
        const reject = (error) => {
            this.#chageState(REJEECTED, error)
        }

        try {
            fn(resolve, reject)
        } catch (error) {
            reject(error)
        }

    }
    #chageState(state, result) {
        if (this.#state !== PENDING) { return }
        this.#state = state
        this.#result = result
        this.#run()
    }
    #run() {
        if (this.#state === PENDING) { return }
        while (this.#task.length) {
            const { onFulfilled, onRejected, resolve, reject } = this.#task.shift()
            if (this.#state === FULFILLED) {
                // 成功

                this.#runCallBack(onFulfilled, resolve, reject)
            } else {
                // 失败
                this.#runCallBack(onRejected, resolve, reject)

            }
        }
    }

    #runCallBack(callback, resolve, reject) {
        this.#microTask(() => {


            if (typeof callback === 'function') {
                try {
                    const res = callback(this.#result)

                    if (this.#isPromse(res)) {
                        res.then(resolve, reject)
                    } else {
                        resolve(res)
                    }
                } catch (error) {
                    reject(error)
                }

            } else {
                const _fn = this.#state === FULFILLED ? resolve : reject
                _fn(this.#result)
            }
        })

    }
    #isPromse(obj) {
        return obj !== null && (typeof obj === 'object' || typeof obj === 'function') && obj.then === 'function'
    }
    #microTask(fn) {
        if (typeof process === 'object' && typeof process.nextTick === 'function') {
            // node
            process.nextTick(fn)
        } else if (typeof MutationObServer === 'function') {
            // web
            const obj = new MutationObServer(fn)
            const textNode = document.createTextNode('1')
            obj.observer(textNode, {
                characterData: true
            })
            textNode.data = '2'
        } else {
            // 其他
            setTimeout(fn, 0)
        }

    }


    then(onFulfilled, onRejected) {
        return new MyPromise((resolve, reject) => {
            this.#task.push({
                onFulfilled, onRejected,
                resolve, reject
            })

            this.#run()
        })
    }

}



const p = new MyPromise((resolve, reject) => {

    setTimeout(() => {
        resolve(333)
    }, 1000)
})

p.then(
    (res) => {
        console.log(res);
        return 1234567
    },
    // null,
    (err) => {
        console.log(err)
        return 456
    }
).then((res) => {
    console.log('2', res)
    throw new Error(1231111)
}).then((res) => {
    console.log('3', res)
},(err)=>{
    console.log('报错了')
    console.log(err)
})