import { isObject, isArray, hasOwn, isIntegerKey } from './shared.js'

const proxyMap = new WeakMap();
const targetMap = new WeakMap();
const ITERATE_KEY = Symbol();  // 新增

let viewEffect = () => { };

export const setViewEffect = (fn) => {
    viewEffect = fn;
    fn();
}

export function reactive(target) {
    const existingProxy = proxyMap.get(target);
    if (existingProxy) {
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

        // 新增 - 类型为对象的嵌套属性处理
        if (isObject(res)) {
            return reactive(res);
        }

        return res;
    },
    set(target, key, value, receiver) {
        // 判断当前操作属于“新增”还是“修改”
        const hadKey = isArray(target) && isIntegerKey(key)
            ? Number(key) < target.length
            : hasOwn(target, key);

        const res = Reflect.set(target, key, value, receiver);
        trigger(target, key, hadKey ? 'set' : 'add');  // 新增操作类型参数
        return res;
    },
    // 新增
    has(target, key) {
        const res = Reflect.has(target, key);
        track(target, key);
        return res;
    },
    // 新增
    ownKeys(target) {
        const key = ITERATE_KEY;
        track(target, key);
        return Reflect.ownKeys(target);
    },
    // 新增
    deleteProperty(target, key) {
        const hadKey = hasOwn(target, key);
        const res = Reflect.deleteProperty(target, key);
        if (res && hadKey) {
            trigger(target, key, 'delete');
        }
        return res
    }
}

const track = (target, key) => {
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, (dep = new Set()));
    }
    dep.add(viewEffect);
}

const trigger = (target, key, type) => {  // 新增 type 参数
    console.log(key, type)
    const depsMap = targetMap.get(target);
    if (!depsMap) {
        return
    }

    let deps = [];  // 用于存放从 depsMap 取出的依赖函数
    if (key !== void 0) {  // 只有 SET/ADD/DELETE 操作才存在 key
        deps.push(depsMap.get(key));
    }

    // 取出 ownKeys 拦截阶段收集的依赖
    switch (type) {
        case 'add':
        case 'delete':
            if (!isArray(target)) {
                deps.push(depsMap.get(ITERATE_KEY));
            }
            break;
    }

    let viewEffects = [];
    for (const dep of deps) {
        if (dep) {
            viewEffects.push(...dep)
        }
    }

    viewEffects = new Set(viewEffects);  // 去重

    viewEffects.forEach(effectFn => {
        effectFn && effectFn()
    });
}