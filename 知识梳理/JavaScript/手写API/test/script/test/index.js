function asyncAdd(a,b ,cb){
    setTimeout(()=>{
        cb (a+b)
    },1000)
}

asyncAdd(1,2,(result)=>{
    console.log(result)
})