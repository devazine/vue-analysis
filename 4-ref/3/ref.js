import {
    shouldTrack,
    activeEffect,
    trackEffects,
    triggerEffects
} from './effect.js'

import { hasChanged } from './shared.js'

import { toRaw, toReactive } from './reactive.js'

export function isRef(r) {
    return !!(r && r.__v_isRef === true)
}

export function ref(value) {
    // if (isRef(value)) {
    //     return value
    // }
    return createRef(value, false)  // 新增 false 参数
}

// 新增
export function shallowRef(value) {
    return createRef(value, true)
}

// 新增
function createRef(rawValue, shallow) {
    if (isRef(rawValue)) {
        return rawValue
    }
    return new RefImpl(rawValue, shallow)
}

class RefImpl {
    constructor(value, __v_isShallow) {  // 新增 __v_isShallow 参数
        this.__v_isRef = true;
        // this._rawValue = newVal;
        // this._value = toReactive(newVal);
        this._rawValue = __v_isShallow ? value : toRaw(value);  // 新增
        this._value = __v_isShallow ? value : toReactive(value)  // 新增
        this.__v_isShallow = __v_isShallow;  // 新增
    }

    get value() {
        trackRefValue(this);
        return this._value;
    }

    set value(newVal) {
        // newVal = toRaw(newVal);
        newVal = this.__v_isShallow ? newVal : toRaw(newVal);  // 新增
        if (hasChanged(newVal, this._rawValue)) {
            this._rawValue = newVal;
            // this._value = toReactive(newVal);
            this._value = this.__v_isShallow ? newVal : toReactive(newVal);  // 新增
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