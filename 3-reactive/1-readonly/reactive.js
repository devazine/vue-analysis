import { mutableHandlers, readonlyHandlers } from './baseHandlers.js'  // 新增引入 readonlyHandlers

export const proxyMap = new WeakMap();
export const readonlyMap = new WeakMap();  // 新增

export const ReactiveFlags = {
    RAW: '__v_raw',
    IS_READONLY: '__v_isReadonly',  // 新增
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

// 新增
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
export function isReadonly(value) {
    return !!(value && value[ReactiveFlags.IS_READONLY]);
}

export function toRaw(observed) {
    const raw = observed && observed[ReactiveFlags.RAW];
    return raw ? toRaw(raw) : observed;
}
