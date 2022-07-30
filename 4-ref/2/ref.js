import {
    shouldTrack,  // 新增
    activeEffect,  // 新增
    trackEffects,
    triggerEffects
} from './effect.js'

import { hasChanged } from './shared.js'

import { toRaw, toReactive } from './reactive.js'  // 新增

export function isRef(r) {
    return !!(r && r.__v_isRef === true)
}

export function ref(value) {
    if (isRef(value)) {
        return value
    }
    return new RefImpl(value)
}

class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
        this._rawValue = toRaw(value);  // 新增
        this._value = toReactive(value);  // 调用 toReactive
    }

    get value() {
        trackRefValue(this);
        return this._value;
    }

    set value(newVal) {
        newVal = toRaw(newVal);  // 新增
        if (hasChanged(newVal, this._rawValue)) {  // 修改 this._value 为 this._rawValue
            this._rawValue = newVal;  // 修改 this._value 为 this._rawValue
            this._value = toReactive(newVal);  // 新增
            triggerRefValue(this);
        }
    }
}

export function trackRefValue(ref) {
    if (shouldTrack && activeEffect) {  // 新增
        trackEffects(ref.dep || (ref.dep = new Set()))
    }
}

export function triggerRefValue(ref) {
    triggerEffects(ref.dep)
}