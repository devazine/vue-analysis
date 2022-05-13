import {
    mutableHandlers, readonlyHandlers,
    shallowReactiveHandlers, shallowReadonlyHandlers
} from './baseHandlers.js'  // 新增引入 shallowReactiveHandlers 和 shallowReadonlyHandlers

export const proxyMap = new WeakMap();
export const readonlyMap = new WeakMap();
export const shallowReactiveMap = new WeakMap();  // 新增
export const shallowReadonlyMap = new WeakMap();  // 新增

export const ReactiveFlags = {
    RAW: '__v_raw',
    IS_READONLY: '__v_isReadonly',
    IS_SHALLOW: '__v_isShallow',  // 新增
};

export function reactive(target) {
    const existingProxy = proxyMap.get(target);
    if (existingProxy) {
        return existingProxy
    }

    const proxy = new Proxy(
        target,
        mutableHandlers
    );

    proxyMap.set(target, proxy);
    return proxy
}

export function readonly(target) {
    const existingProxy = readonlyMap.get(target);
    if (existingProxy) {
        return existingProxy
    }

    const proxy = new Proxy(
        target,
        readonlyHandlers
    );

    readonlyMap.set(target, proxy);
    return proxy
}

// 新增
export function shallowReactive(target) {
    const existingProxy = shallowReactiveMap.get(target);
    if (existingProxy) {
        return existingProxy
    }

    const proxy = new Proxy(
        target,
        shallowReactiveHandlers  // 浅响应专属 handler
    );

    shallowReactiveMap.set(target, proxy);
    return proxy
}

// 新增
export function shallowReadonly(target) {
    const existingProxy = shallowReadonlyMap.get(target);
    if (existingProxy) {
        return existingProxy
    }

    const proxy = new Proxy(
        target,
        shallowReadonlyHandlers  // 浅只读专属 handler
    );

    shallowReadonlyMap.set(target, proxy);
    return proxy
}

// 新增
export function isShallow(value) {
    return !!(value && value[ReactiveFlags.IS_SHALLOW]);
}

export function isReadonly(value) {
    return !!(value && value[ReactiveFlags.IS_READONLY]);
}

export function toRaw(observed) {
    const raw = observed && observed[ReactiveFlags.RAW];
    return raw ? toRaw(raw) : observed;
}

