
# 准备工作

DApp，对前端来说，大体上需要有以下两个部分

## 前端展示界面
- React：渲染web端的sdk，（为什么不说框架，因为官方说的：The library for web and native user interfaces）
- nodejs （需要前置安装）：前端运行环境, 建议v22及以上版本。 所有环节第一个安装
- Rainbowkit：web3的UI库，包含了链接钱包，展示钱包相关信息的UI组件
- Wagmi：这个是React Hooks，作用是链接钱包
- 如果不用 Rainbowkit+Wagmi，也可以直接安装 antd-web3 组件库
- 

## 智能合约
- Hardhat（需要前置安装）： 一个脚手架，用于创建智能合约工程、编译、部署、测试，并和以太坊进行网络通讯的工具 [hardhat](https://v2.hardhat.org/hardhat-runner/docs/getting-started)
- Ganache（需要前置 下载& 安装）： 一个用来建立本地以太坊的开发、测试环境的工具。可以创建虚拟测试账户，进行测试，[Ganache](https://archive.trufflesuite.com/ganache/)
- Metamask（需要注册&安装）： 俗称小狐狸，就是加密货币钱包。有chrome插件和客户端。本地开发的时候可以用它来模拟交易，进行测试。 [Metamask](https://metamask.io/zh-CN/download)
- Remix（需要注册，看需求安装） : 用来测试智能合约的工具，有在线版本，也有客户端：[Remix IDE](https://remix.ethereum.org/)
- walletConnect Cloud（需要注册）： 一个用来连接钱包的服务，需要在上面注册一个项目，获取到 projectId 信息。

> 注意：整个开发过程需要在国外

按照上面的信息，安装&注册顺序如下：

nodejs-> Metamask -> walletConnect Cloud-> Ganache -> Hardhat -> Remix

# 开发步骤

1. 初始化react工程， 根据自己的需求来决定是用nextjs、umi、还是 vite
2. 安装依赖
> yarn add @rainbow-me/rainbowkit wagmi viem@2.x @tanstack/react-query

3. wagmi 的配置需要 projectId 信息，可以 [walletConnect Cloud](cloud.walletconnect.com) 创建一个，免费的。

``` js
const config = getDefaultConfig({
  appName: 'RainbowKit app', // 应用名称
  projectId: 'YOUR_PROJECT_ID', // walletConnect Cloud 创建的项目ID
  chains: [mainnet, polygon, optimism, arbitrum, base, sepolia], // 支持链接的钱包list
})
 
```

4. 初始化智能合约的工程
- 这里需要注意的是，每个智能合约，都至少要关联一个账户（交易收款账户）
- 用 Ganache 创建的本地的测试环境， 里面随便一个账户的 key
- 智能合约的语法是：solidity


以上就是DApp开发的准备工作

# 参考资料
[Dapp 入门开发](https://juejin.cn/post/7361684907809079306)