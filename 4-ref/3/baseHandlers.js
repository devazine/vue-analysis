import { isObject, isArray, hasOwn, isIntegerKey, hasChanged, isSymbol } from './shared.js'
import {
    reactive, readonly,
    toRaw, ReactiveFlags, proxyMap, readonlyMap, shallowReactiveMap, shallowReadonlyMap
} from './reactive.js'
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

const builtInSymbols = new Set(
    Object.getOwnPropertyNames(Symbol)
        .map(key => (Symbol)[key])
        .filter(isSymbol)
)

function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key, receiver) {
        const targetFromMap = (isReadonly
            ? shallow
                ? shallowReadonlyMap
                : readonlyMap
            : shallow
                ? shallowReactiveMap
                : proxyMap
        ).get(target);

        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly
        } else if (key === ReactiveFlags.IS_SHALLOW) {
            return shallow
        } else if (key === ReactiveFlags.RAW && targetFromMap) {
            return target;
        }

        const targetIsArray = isArray(target);

        if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
            return Reflect.get(arrayInstrumentations, key, receiver)
        }

        const res = Reflect.get(target, key, receiver);

        if (isSymbol(key) && builtInSymbols.has(key)) {
            return res;
        }

        if (!isReadonly) {
            track(target, key);
        }

        if (shallow) {
            return res
        }

        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }

        return res;
    }
}

function createSetter() {
    return function set(target, key, value, receiver) {
        let oldValue = target[key];
        value = toRaw(value);
        oldValue = toRaw(oldValue);

        const hadKey = isArray(target) && isIntegerKey(key)
            ? Number(key) < target.length
            : hasOwn(target, key);

        const res = Reflect.set(target, key, value, receiver);
        if (!hadKey) {
            trigger(target, key, 'add', value)
        } else if (hasChanged(value, oldValue)) {
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

const readonlyGet = createGetter(true);

export const readonlyHandlers = {
    get: readonlyGet,
    set(target, key) {
        console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`)
        return true
    },
    deleteProperty(target, key) {
        console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`);
        return true
    }
}

export const shallowReactiveHandlers = Object.assign(
    {},
    mutableHandlers,
    {
        get: createGetter(false, true),
        set: createSetter()
    }
)

export const shallowReadonlyHandlers = Object.assign(
    {},
    readonlyHandlers,
    {
        get: createGetter(true, true)
    }
)