Function.prototype.myCall = function (ctx, ...args) {
    if (ctx === undefined || ctx === null) {
        ctx = globalThis
    } else {
        ctx = Object(ctx)
    }

    const fn = this;
    const key = Symbol('temp')

    Object.defineProperty(ctx, key, {
        value: fn,

    })

    const result = ctx[key](...args)
    delete ctx[key]
    return result
}

// ---

function method(a, b) {
    console.log(this, a, b)
    return a + b
}

method.myCall(123, 2, 3)

method.call('123', 4, 5)


function Index() {
    const [num, setNumber] = React.useState(0)
    const handerClick = () => {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                setNumber(num + 1)
                console.log(num)
            }, 1000)
        }
    }
    return <button onClick={handerClick} >{num}</button>
} 