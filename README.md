# Vue 3 源码解析调试代码

Devazine [《Vue 源码解析》](https://devazine.github.io/#/source-analysis/vue/)系列文章 Demo。

交流Q群 - 前端冒险岛：`460065020`

# 文章 Demo 指南

## [reactive 的实现（上）](https://devazine.github.io/#/source-analysis/vue/3/)：

- `1-reactive/1` ： 二. Track 和 Trigger
- `1-reactive/2` ： 3.1 嵌套属性处理 - 3.2.2 ownKeys 拦截器
- `1-reactive/3` ： 3.3.1 trigger 部分的完善
- `1-reactive/4` ： 3.3.2 修复递归追踪问题
- `1-reactive/5` ： 3.3.3 toRaw - 3.3.4 检索方法处理
- `1-reactive/6` ： 四、代码优化

## [reactive 的实现（中）](https://devazine.github.io/#/source-analysis/vue/4/)：

- `2-reactive/1` ： 一. 依赖清理
- `2-reactive/2` ： 二. 迭代器方法拦截 - 三.嵌套 effect

## [reactive 的实现（下）](https://devazine.github.io/#/source-analysis/vue/5/)：

- `3-reactive/1-readonly` : 一. 只读接口
- `3-reactive/2-shallow` : 二. 浅响应和浅只读接口
- `3-reactive/3` : 三. markRaw - 四. 工具方法补充
- `3-reactive/4` : 五. 代理集合类型

## [ref 的实现（上）](https://devazine.github.io/#/source-analysis/vue/6/)：

- `4-ref/1` : 一. ref 的基础实现
- `4-ref/2` : 二. 兼容非原始类型
- `4-ref/3` : 三. shallowRef 的实现

## [ref 的实现（下）](https://devazine.github.io/#/source-analysis/vue/7/)：

- `4-ref/4` : 一. toRef 和 toRefs
- `4-ref/5` : 二. customRef
- `4-ref/6` : 三. proxyRefs