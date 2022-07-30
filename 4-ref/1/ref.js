import {
    trackEffects,
    triggerEffects
} from './effect.js'

import { hasChanged } from './shared.js'

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
        this._value = value;
    }

    get value() {
        trackRefValue(this);  // 依赖收集
        return this._value;
    }

    set value(newVal) {
        if (hasChanged(newVal, this._value)) {
            this._value = newVal;
            triggerRefValue(this);  // 触发收集到的副作用函数
        }
    }
}

export function trackRefValue(ref) {
    trackEffects(ref.dep || (ref.dep = new Set()))
}

export function triggerRefValue(ref) {
    triggerEffects(ref.dep)
}