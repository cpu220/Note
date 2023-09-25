Promise.myAll = (arr) => {
    let _resolve, _reject
    const p = new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
    });

    let count = 0;
    let fulFilledCount = 0;
    const result = []
    for (const item of arr) {

        const i = count;

        Promise.resolve(item).then((data) => {
            // 将成功的数据汇总到 
            console.log(data)
            // 记录顺序
            result[i] = data
            // 判断是不是全部完成
            fulFilledCount++
            if (fulFilledCount === count) {
                _resolve(result)
            }
        }, _reject)
        count++;
    }

    if (count === 0) {
        _resolve(result)
    }
    return p

}



const arr = []
for (let i = 0; i < 5; i++) {
    const a = parseFloat(10 * Math.random() % 10) | 0
    let type = a % 2 === 0
    console.log(i, type)
    arr.push(
        new Promise((resolve, reject) => {

            setTimeout(() => {
                let str = `第${i}`
                resolve(str)
                // if (type) {
                //     resolve(str)
                // } else {
                //     reject(str)
                // }
            }, 1000)
        })
    )
}

Promise.myAll(arr).then((data) => {
    console.log('then', data)
}).catch((res) => {
    console.log('catch', res)
})