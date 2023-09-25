 function User (username,password){
     this.username = username;
     this.password = password;
 }

User.prototype.payFreeVideo = function(){
    console.log(`${this.username}免费看视频`)
}


function VIPUser(username,password,level){
    User.call(this,username,password)
    this.level = level;
}

 
// VIPUser.prototype.__proto__ = User.prototype
Object.setPrototypeOf(VIPUser.prototype,User.prototype)

VIPUser.prototype.playPayVideo = function(){
    console.log(`${this.username}付费看VIP视频`)
}


const p = new User('张三','123456') // {username: '张三', password: '123456'}
const p2 = new VIPUser('李四','123456','VIP1') //  {username: '李四', password: '123456', level: 'VIP1'}level: "VIP1"password: "123456"username: "李四"[[Prototype]]: Object
