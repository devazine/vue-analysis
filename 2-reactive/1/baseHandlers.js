import { isObject, isArray, hasOwn, isIntegerKey, hasChanged } from './shared.js'
import { reactive, toRaw, ReactiveFlags, proxyMap } from './reactive.js'
import { track, trigger, ITERATE_KEY, pauseTracking, resetTracking } from './effect.js'

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

const get = createGetter();
const set = createSetter();

function createGetter() {
    return function get(target, key, receiver) {
        if (key === ReactiveFlags.RAW && proxyMap.get(target)) {
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
    }
}

function createSetter() {
    return function set(target, key, value, receiver) {
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
    }
}

function has(target, key) {
    const res = Reflect.has(target, key);
    track(target, key);
    return res;
}

function ownKeys(target) {
    const key = isArray(target) ? 'length' : ITERATE_KEY;
    track(target, key);
    return Reflect.ownKeys(target);
}

function deleteProperty(target, key) {
    const hadKey = hasOwn(target, key);
    const res = Reflect.deleteProperty(target, key);
    if (res && hadKey) {
        trigger(target, key, 'delete');
    }
    return res
}


export const mutableHandlers = {
    get,
    set,
    deleteProperty,
    has,
    ownKeys
}