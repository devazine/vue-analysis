import { isObject, isArray, hasOwn, isIntegerKey } from './shared.js'

const proxyMap = new WeakMap();
const targetMap = new WeakMap();
const ITERATE_KEY = Symbol();

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

        if (isObject(res)) {
            return reactive(res);
        }

        return res;
    },
    set(target, key, value, receiver) {
        const hadKey = isArray(target) && isIntegerKey(key)
            ? Number(key) < target.length
            : hasOwn(target, key);

        const res = Reflect.set(target, key, value, receiver);
        trigger(target, key, hadKey ? 'set' : 'add');
        return res;
    },
    has(target, key) {
        const res = Reflect.has(target, key);
        track(target, key);
        return res;
    },
    ownKeys(target) {
        const key = isArray(target) ? 'length' : ITERATE_KEY;  // 数组改用 length 为凭证
        track(target, key);
        return Reflect.ownKeys(target);
    },
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
        dep.add(viewEffect);
    }
}

const trigger = (target, key, type, newValue) => {  // 新增 newValue 参数
    const depsMap = targetMap.get(target);
    if (!depsMap) {
        return
    }

    let deps = [];

    // 新增判断，若用户修改了数组的 length 属性，需要取出相关依赖
    if (key === 'length' && isArray(target)) {
        // 注意 Map 的 forEach 参数为 (MapValue, MapKey)
        depsMap.forEach((dep, key) => {
            // newValue 在这里为用户赋予 length 的新值
            if (key === 'length' || key >= newValue) {
                // 当 depsMap 含有以 length 为凭证，或以被移除元素的索引值为凭证的依赖时，
                // 取出该依赖
                deps.push(dep)
            }
        })
    } else {
        if (key !== void 0) {
            deps.push(depsMap.get(key));
        }

        switch (type) {
            case 'add':
                if (!isArray(target)) {
                    deps.push(depsMap.get(ITERATE_KEY));
                } else if (isIntegerKey(key)) {  // 若属性为索引字符串
                    deps.push(depsMap.get('length'))  // 取出 ownKeys 阶段收集的依赖
                }
                break;
            case 'delete':
                if (!isArray(target)) {
                    deps.push(depsMap.get(ITERATE_KEY));
                }
                break;
        }
    }

    let viewEffects = [];
    for (const dep of deps) {
        if (dep) {
            viewEffects.push(...dep)
        }
    }

    viewEffects = new Set(viewEffects);

    viewEffects.forEach(effectFn => {
        effectFn && effectFn()
    });
}