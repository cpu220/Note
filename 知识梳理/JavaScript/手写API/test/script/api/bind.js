function fn(a, b, c, d) {
    console.log(a, b, c, d);
    console.log(this);
    return 123
}

Function.prototype.myBind = function (ctx) {
    // 获取参数
    const arg = Array.prototype.slice.call(arguments, 1)

    const fn = this;
    return function _bind() {
        // 拼接实际入参
        const _arr = Array.prototype.slice.call(arguments)
        const _arrArgs = [].concat(arg, _arr)


        if (Object.getPrototypeOf(this) === _bind.prototype) {
            // 创建一个新的空对象
            var obj = {};
            // 将 obj 的原型设置为 fn 的原型
            Object.setPrototypeOf(obj, fn.prototype);
            // 通过 apply 方法将 fn 函数的 this 设置为 obj，并传递参数 _arrArgs
            fn.apply(obj, _arrArgs);
            // 返回这个新创建的对象
            return obj;
        } else {
            return fn.apply(ctx, _arrArgs)
        }

    }
}


const newFn = fn.myBind('ctx', 1, 2);
const result = new newFn(3, 4) 
// newFn(3,4)