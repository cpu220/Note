function sayHello(greeting) {
    console.log(greeting + ", " + this.name);
}




let person1 = { name: "Alice" };
let person2 = {name: "Bob"};


Function.prototype.myApply = function(ctx,arr){
    if(ctx === undefined || ctx === null ){
        ctx = globalThis
    }else { 
        ctx = Object(ctx)
    }
    
    const _arr = arr?arr:[]
    const fn = this;
    const key = Symbol('temp')

    Object.defineProperty(ctx,key,{
        value:fn
    })

    const result = ctx[key](..._arr)
    delete ctx[key]
    return result

}


// sayHello.apply(person1, ["Hello"]); 
sayHello.myApply(person1,); 
// sayHello.myApply('person2', ["Hello"]); 


sayHello.apply(person1, ); 
// sayHello.apply('person2', ["Hello"]); 