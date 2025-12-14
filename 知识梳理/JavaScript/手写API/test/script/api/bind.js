// 获取除了第一个参数(ctx)之外的所有参数，这些参数将被预设（柯里化）
    const arg = Array.prototype.slice.call(arguments, 1)

    // 保存调用myBind的原始函数，这里的this指向的是调用myBind的那个函数
    const fn = this;
    
    // 返回一个新函数，这个新函数会在调用时绑定正确的this和参数
    // 这里写成 _bind(...args)  也可以，只要最终 apply的参数是2个参数的合并就行
    return function _bind() {
        // 获取新函数调用时传入的参数
        const _arr = Array.prototype.slice.call(arguments)
        // 将预设的参数和新传入的参数合并
        const _arrArgs = [].concat(arg, _arr)

        // 判断绑定后的函数是否通过new关键字调用（作为构造函数使用）
        // Object.getPrototypeOf(this) === _bind.prototype 是判断this是否为_bind函数的实例
        if (Object.getPrototypeOf(this) === _bind.prototype) {
            // 如果是通过new调用，则需要创建一个新对象，并将this绑定到这个新对象上
            // 创建一个新的空对象
            var obj = {};
            // 将 obj 的原型设置为原始函数fn的原型，这样新创建的对象就能继承fn.prototype上的属性和方法
            Object.setPrototypeOf(obj, fn.prototype);
            // 通过 apply 方法将 fn 函数的 this 设置为 obj，并传递合并后的参数 _arrArgs
            fn.apply(obj, _arrArgs);
            // 返回这个新创建的对象，这符合构造函数的行为
            return obj;
        } else {
            // 如果不是通过new调用，则直接将fn的this绑定为传入的ctx，并传递合并后的参数
            return fn.apply(ctx, _arrArgs)
        }

    }