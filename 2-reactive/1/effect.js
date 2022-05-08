import { isArray, isIntegerKey } from './shared.js'

const targetMap = new WeakMap();
export const ITERATE_KEY = Symbol();

export let shouldTrack = true;
const trackStack = [];

// 删除
// let viewEffect;
// export const setViewEffect = (fn) => {
//     viewEffect = fn;
//     fn();
// }

// 新增
let activeEffect;

// 新增
class ReactiveEffect {
    constructor(fn) {
        this.fn = fn;
        this.deps = [];
    }
    run() {
        activeEffect = this;
        shouldTrack = true;
        cleanupEffect(this);
        return this.fn();
    }
}

// 新增
export const effect = (fn) => {  // 更名为 effect
    const _effect = new ReactiveEffect(fn);
    _effect.run();
}

function cleanupEffect(effect) {
    const { deps } = effect
    if (deps.length) {
        for (let i = 0; i < deps.length; i++) {
            deps[i].delete(effect)
        }
        deps.length = 0
    }
}

export function pauseTracking() {
    trackStack.push(shouldTrack)
    shouldTrack = false
}

export function resetTracking() {
    const last = trackStack.pop();
    shouldTrack = last === undefined ? true : last
}

export const track = (target, key) => {
    if (!shouldTrack || !activeEffect) return;
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, (dep = new Set()));
    }

    // dep.add(viewEffect);  // 删除
    trackEffects(dep);  // 新增
}

// 新增
export function trackEffects(dep){
    // 可能
    let shouldTrack = !dep.has(activeEffect);
    if (shouldTrack) {
        dep.add(activeEffect);
        activeEffect.deps.push(dep);
    }
}

export const trigger = (target, key, type, newValue) => {
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
    
    // 新增
    triggerEffects(viewEffects);
    
    // 删除
    // viewEffects.forEach(effectFn => {
    //     shouldTrack = true;
    //     effectFn && effectFn()
    // });
}

// 新增
export function triggerEffects(dep){
    const depArray = isArray(dep) ? dep : [...dep];
    for (const effect of depArray) {
        effect.run();
    }
}