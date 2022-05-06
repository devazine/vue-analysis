import { isObject, isArray, hasOwn, isIntegerKey, hasChanged } from './shared.js'

const proxyMap = new WeakMap();
const targetMap = new WeakMap();
const ITERATE_KEY = Symbol();

let viewEffect;

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

export let shouldTrack = true;
const trackStack = [];

export function pauseTracking() {
    trackStack.push(shouldTrack)
    shouldTrack = false
}

export function resetTracking() {
    const last = trackStack.pop()
    shouldTrack = last === undefined ? true : last
}

function toRaw(observed) {
    const raw = observed && observed["__v_raw"];
    return raw ? toRaw(raw) : observed;
}

function createArrayInstrumentations() {
    const instrumentations = {};
    ['includes', 'indexOf', 'lastIndexOf'].forEach(key => {
        instrumentations[key] = function (...args) {
            const arr = toRaw(this);
            for (let i = 0, l = this.length; i < l; i++) {
                track(arr, "get", i + '');
            }
            const res = arr[key](...args);
            if (res === -1 || res === false) {
                return arr[key](...args.map(toRaw));
            } else {
                return res;
            }
        };
    });

    ['push', 'pop', 'shift', 'unshift', 'splice'].forEach(key => {
        instrumentations[key] = function (...args) {
            pauseTracking();
            const res = toRaw(this)[key].apply(this, args);
            resetTracking();
            return res
        }
    })
    return instrumentations
}

const arrayInstrumentations = createArrayInstrumentations();

const baseHandlers = {
    get(target, key, receiver) {
        if (key === "__v_raw" && proxyMap.get(target)) {
            return target;
        }

        const targetIsArray = isArray(target);

        if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
            return Reflect.get(arrayInstrumentations, key, receiver)
        }

        const res = Reflect.get(target, key, receiver);
        track(target, key);

        if (isObject(res)) {
            return reactive(res);
        }

        return res;
    },
    set(target, key, value, receiver) {
        let oldValue = target[key];  // 新增
        // 新旧值都有可能属于响应式对象
        // 将它们都转为原生引用，方便做对比
        value = toRaw(value);
        oldValue = toRaw(oldValue);

        const hadKey = isArray(target) && isIntegerKey(key)
            ? Number(key) < target.length
            : hasOwn(target, key);

        const res = Reflect.set(target, key, value, receiver);
        if (!hadKey) {
            trigger(target, key, 'add', value)
        } else if (hasChanged(value, oldValue)) {  // 新增判断
            trigger(target, key, 'set', value)
        }
        return res;
    },
    has(target, key) {
        const res = Reflect.has(target, key);
        track(target, key);
        return res;
    },
    ownKeys(target) {
        const key = isArray(target) ? 'length' : ITERATE_KEY;
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
    if (!shouldTrack || !viewEffect) return;
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

const trigger = (target, key, type, newValue) => {
    const depsMap = targetMap.get(target);
    if (!depsMap) {
        return
    }

    let deps = [];

    if (key === 'length' && isArray(target)) {
        depsMap.forEach((dep, key) => {
            if (key === 'length' || key >= newValue) {
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
                } else if (isIntegerKey(key)) {
                    deps.push(depsMap.get('length'))
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