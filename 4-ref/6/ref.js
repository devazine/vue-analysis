import {
    shouldTrack,
    activeEffect,
    trackEffects,
    triggerEffects
} from './effect.js'

import { hasChanged, isArray } from './shared.js'

import { toRaw, toReactive, isReactive } from './reactive.js'

export function toRef(object, key, defaultValue) {
    const val = object[key]
    return isRef(val)
        ? val
        : (new ObjectRefImpl(object, key, defaultValue))
}

export function toRefs(object) {
    const ret = isArray(object) ? new Array(object.length) : {}
    for (const key in object) {
        ret[key] = toRef(object, key)
    }
    return ret
}

class ObjectRefImpl {
    constructor(object, key, defaultValue) {
        this.__v_isRef = true;
        this._object = object;
        this._key = key;
        this._defaultValue = defaultValue;
    }
    get value() {
        const val = this._object[this._key]
        return val === undefined ? this._defaultValue : val
    }
    set value(newVal) {
        this._object[this._key] = newVal
    }
}

export function isRef(r) {
    return !!(r && r.__v_isRef === true)
}

export function ref(value) {
    return createRef(value, false)
}

export function shallowRef(value) {
    return createRef(value, true)
}

function createRef(rawValue, shallow) {
    if (isRef(rawValue)) {
        return rawValue
    }
    return new RefImpl(rawValue, shallow)
}

class RefImpl {
    constructor(value, __v_isShallow) {
        this.__v_isRef = true;
        this._rawValue = __v_isShallow ? value : toRaw(value);
        this._value = __v_isShallow ? value : toReactive(value);
        this.__v_isShallow = __v_isShallow;
    }

    get value() {
        trackRefValue(this);
        return this._value;
    }

    set value(newVal) {
        newVal = this.__v_isShallow ? newVal : toRaw(newVal);
        if (hasChanged(newVal, this._rawValue)) {
            this._rawValue = newVal;
            this._value = this.__v_isShallow ? newVal : toReactive(newVal);
            triggerRefValue(this);
        }
    }
}

export function trackRefValue(ref) {
    if (shouldTrack && activeEffect) {
        trackEffects(ref.dep || (ref.dep = new Set()))
    }
}

export function triggerRefValue(ref) {
    triggerEffects(ref.dep)
}

export function customRef(factory) {
    return new CustomRefImpl(factory)
}

class CustomRefImpl {
    constructor(factory) {
        this.__v_isRef = true;
        const { get, set } = factory(
            () => trackRefValue(this),
            () => triggerRefValue(this)
        )
        this._get = get;
        this._set = set;
    }
    get value() {
        return this._get()
    }

    set value(newVal) {
        this._set(newVal)
    }
}

// 新增
export function unref(ref) {
    return isRef(ref) ? (ref.value) : ref
}

// 新增
export function proxyRefs(objectWithRefs) {
    return isReactive(objectWithRefs)
        ? objectWithRefs
        : new Proxy(objectWithRefs, shallowUnwrapHandlers)
}

// 新增
const shallowUnwrapHandlers = {
    get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
    set: (target, key, value, receiver) => {
        const oldValue = target[key]
        if (isRef(oldValue) && !isRef(value)) {
            oldValue.value = value
            return true
        } else {
            return Reflect.set(target, key, value, receiver)
        }
    }
}