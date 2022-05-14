import {  // 新增引入 Map / Set 的 handlers
    mutableCollectionHandlers,
    readonlyCollectionHandlers,
    shallowCollectionHandlers,
    shallowReadonlyCollectionHandlers
} from './collectionHandlers.js'

import {
    mutableHandlers, readonlyHandlers,
    shallowReactiveHandlers, shallowReadonlyHandlers
} from './baseHandlers.js'

import { def, toRawType, isObject } from './shared.js'

export const proxyMap = new WeakMap();
export const readonlyMap = new WeakMap();
export const shallowReactiveMap = new WeakMap();
export const shallowReadonlyMap = new WeakMap();

export const ReactiveFlags = {
    RAW: '__v_raw',
    SKIP: '__v_skip',
    IS_REACTIVE: '__v_isReactive',
    IS_READONLY: '__v_isReadonly',
    IS_SHALLOW: '__v_isShallow',
};

// 新增
const TargetType = {
    INVALID: 0,
    COMMON: 1,
    COLLECTION: 2
}

// 新增
function targetTypeMap(rawType) {
    switch (rawType) {
        case 'Object':
        case 'Array':
            return TargetType.COMMON
        case 'Map':
        case 'Set':
        case 'WeakMap':
        case 'WeakSet':
            return TargetType.COLLECTION
        default:
            return TargetType.INVALID
    }
}

function createReactiveObject(target, handlers, collectionHandlers, map) {  // 新增 collectionHandlers 参数
    const existingProxy = map.get(target);
    if (existingProxy) {
        return existingProxy
    }

    if (target[ReactiveFlags.SKIP] || !isObject(target) || !Object.isExtensible(target)) {
        return target
    }

    // 新增
    const targetType = targetTypeMap(toRawType(target));

    const proxy = new Proxy(
        target,
        targetType === TargetType.COLLECTION ? collectionHandlers : handlers // 修改
    );

    map.set(target, proxy);
    return proxy
}

export function reactive(target) {
    //  新增 mutableCollectionHandlers 参数 
    return createReactiveObject(target, mutableHandlers, mutableCollectionHandlers, proxyMap)
}

export function readonly(target) {
    //  新增 readonlyCollectionHandlers 参数 
    return createReactiveObject(target, readonlyHandlers, readonlyCollectionHandlers, readonlyMap)
}

export function shallowReactive(target) {
    //  新增 shallowCollectionHandlers 参数 
    return createReactiveObject(target, shallowReactiveHandlers, shallowCollectionHandlers, shallowReactiveMap)
}

export function shallowReadonly(target) {
    //  新增 shallowReadonlyCollectionHandlers 参数 
    return createReactiveObject(target, shallowReadonlyHandlers, shallowReadonlyCollectionHandlers, shallowReadonlyMap)
}

export function toRaw(observed) {
    const raw = observed && observed[ReactiveFlags.RAW];
    return raw ? toRaw(raw) : observed;
}

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
    if (isReadonly(value)) {
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
