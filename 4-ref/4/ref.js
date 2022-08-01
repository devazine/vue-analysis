import {
    shouldTrack,
    activeEffect,
    trackEffects,
    triggerEffects
} from './effect.js'

import { hasChanged, isArray } from './shared.js'

import { toRaw, toReactive } from './reactive.js'

// 新增
export function toRef(object, key, defaultValue) {
    const val = object[key]
    return isRef(val)
        ? val
        : (new ObjectRefImpl(object, key, defaultValue))
}

// 新增
export function toRefs(object) {
    const ret = isArray(object) ? new Array(object.length) : {}
    for (const key in object) {
        ret[key] = toRef(object, key)
    }
    return ret
}

// 新增
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