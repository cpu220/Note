Webkit支持不同的浏览器，所以在不同的浏览器中，其能力是有区别的。
从结构上来说，底层的是操作系统。操作系统之上，就是webkit所依赖个相关模块(图形库、网络库等)，这些是webkit运行时所需要的基础。
再往上就是webkit项目。webkit项目分为两部分

WebCore，主要是网页的加载和渲染部分。
JavaScriptCore引擎是webkit的默认JavaScript引擎。之所以是默认，是JavaScript引擎对于webkit在设计上来说，是独立的模块。所以在chromium里，JavaScript的引擎就是V8.

webkit Ports 指的是webkit中非共享部分，对于不同的浏览器来说，由于移植中的一些模块由于平台差异，或者依赖的第三方库和需求等原因，往往各不相同。这就导致了移植部分和webkit行为并不一致的原因。

在webkit 和 webCore 之上，就是嵌入式编程接口

---

对于chromium来说，其项目的架构和webkit不同，因为引入了很多新的功能，所以模块众多，其中最著名的就是Content模块和 content API 。这俩是chromium对网页渲染功能的抽象。

Content 本意是网页内容，在浏览器中，代表渲染网页内容的模块，其和webkit的区别是
  * 虽然没有Content模块，也能在webkit移植的chromium上进行网页内容的渲染。但是Content所包含的沙箱、跨进程GPU加速等功能就没有，包括HTML5在内的众多功能，都是包含在Content模块内的。

而content API，则是 content将下层的渲染机制、安全机制、插件机制包装起来，从而需要向上提供的接口合集，以便于给更上次的chromium、Content shell、包括外部的CEF等调用。

Content shell 是使用Content API包装出来的一层壳，同样也是一个浏览器，用户可以使用Content来渲染和显示网页内容，只是比较简单。
Content shell 的定位是
  * 用来测试content的模块，如渲染，硬件加速
  * 用来当做demo模板，给外部项目进行参照，以此来开发基于content API的浏览器

在Android系统上，Content Shell没有开源，因为其并没有开源，所以在Android系统上使用率就很高。所以存在Android Webview这种给Android定制的Webview。



