const proxyMap = new WeakMap();
const targetMap = new WeakMap();

let viewEffect = () => { };

export const setViewEffect = (fn) => {
    viewEffect = fn;
    fn();
}

export function reactive(target) {
    const existingProxy = proxyMap.get(target);
    if (existingProxy) {
        // 已被代理过，直接返回缓存的代理对象
        // 避免重复被代理
        return existingProxy
    }

    const proxy = new Proxy(
        target,
        baseHandlers
    );

    proxyMap.set(target, proxy);
    return proxy
}

const baseHandlers = {
    get(target, key, receiver) {
        const res = Reflect.get(target, key, receiver);
        track(target, key);
        return res;
    },
    set(target, key, value, receiver) {
        const res = Reflect.set(target, key, value, receiver);
        trigger(target, key, value);
        return res;
    }
}

// 追踪
const track = (target, key) => {
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, (dep = new Set()));
        dep.add(viewEffect);
        console.log(`Key "${key}" is traced...`);
    }
}

// 触发
const trigger = (target, key, value) => {
    const depsMap = targetMap.get(target);
    if (!depsMap) {
        // 未被追踪过
        return
    }
    const viewEffects = depsMap.get(key);
    console.log(`Trggering effects Functions of key "${key}"...`);
    viewEffects.forEach(effectFn => effectFn());
}