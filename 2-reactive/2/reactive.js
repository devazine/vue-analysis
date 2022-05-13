import { mutableHandlers } from './baseHandlers.js'

export const proxyMap = new WeakMap();
export const ReactiveFlags = {
    RAW: '__v_raw'
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

export function toRaw(observed) {
    const raw = observed && observed[ReactiveFlags.RAW];
    return raw ? toRaw(raw) : observed;
}

