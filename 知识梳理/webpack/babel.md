# babel 插件

## 有插件又有预设的情况下，运行顺序如下：
1. 插件在 Presets 之前运行。
2. 插件顺序从前往后排列。
3. Preset顺序是颠倒的（从后往前）

ps： 通常情况下， @babel/preset-env 只转换那些已经行金城江正式标准的语法，对于某些处于早期阶段、还没有确定的语法不做转换

```
{

    "presets":[
       "a","b"
    ],
    plugins:[
        "c","d"
    ]
}

顺序：c->d ->b->a

```