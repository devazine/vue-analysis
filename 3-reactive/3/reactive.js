import {
    mutableHandlers, readonlyHandlers,
    shallowReactiveHandlers, shallowReadonlyHandlers
} from './baseHandlers.js'

import { def } from './shared.js'  // 新增

export const proxyMap = new WeakMap();
export const readonlyMap = new WeakMap();
export const shallowReactiveMap = new WeakMap();
export const shallowReadonlyMap = new WeakMap();  

export const ReactiveFlags = {
    RAW: '__v_raw',
    SKIP: '__v_skip', // 新增
    IS_REACTIVE: '__v_isReactive', // 新增
    IS_READONLY: '__v_isReadonly',  // 新增
    IS_SHALLOW: '__v_isShallow',  // 新增
};

// 新增封装方法
function createReactiveObject(target, handler, map) {
    const existingProxy = map.get(target);
    if (existingProxy) {
        return existingProxy
    }

    if(target[ReactiveFlags.SKIP]) {  // 新增
        return target
    }

    const proxy = new Proxy(
        target,
        handler
    );

    map.set(target, proxy);
    return proxy
}

export function reactive(target) {
    return createReactiveObject(target, mutableHandlers, proxyMap)
}

export function readonly(target) {
    return createReactiveObject(target, readonlyHandlers, readonlyMap)
}

export function shallowReactive(target) {
    return createReactiveObject(target, shallowReactiveHandlers, shallowReactiveMap)
}

export function shallowReadonly(target) {
    return createReactiveObject(target, shallowReadonlyHandlers, shallowReadonlyMap)
}

export function toRaw(observed) {
    const raw = observed && observed[ReactiveFlags.RAW];
    return raw ? toRaw(raw) : observed;
}

/** 下方均为新增 **/ 

export function markRaw(value) {
    def(value, ReactiveFlags.SKIP, true)
    return value
}

export function isShallow(value) {
    return !!(value && value[ReactiveFlags.IS_SHALLOW]);
}

export function isReadonly(value) {
    return !!(value && value[ReactiveFlags.IS_READONLY]);
}

export function isReactive(value) {
    if (isReadonly(value)) {  // 处理 readonly(reactive(target)) 场景
        return isReactive((value)[ReactiveFlags.RAW])
    }
    return !!(value && value[ReactiveFlags.IS_REACTIVE]);
}

export function isProxy(value) {
    return isReactive(value) || isReadonly(value)
}

export const toReactive = (value) =>
  isObject(value) ? reactive(value) : value

export const toReadonly = (value) =>
  isObject(value) ? readonly(value) : value
