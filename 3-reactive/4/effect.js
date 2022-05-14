import { isArray, isIntegerKey, isMap } from './shared.js'

const targetMap = new WeakMap();
export const ITERATE_KEY = Symbol();
export const MAP_KEY_ITERATE_KEY = Symbol();  // 新增

export let shouldTrack = true;
const trackStack = [];

let activeEffect;

class ReactiveEffect {
    constructor(fn) {
        this.fn = fn;
        this.deps = [];
        this.parent = undefined;
    }
    run() {
        let parent = activeEffect;
        let lastShouldTrack = shouldTrack;
        while (parent) {
            if (parent === this) {
                return;
            }
            parent = parent.parent;
        }

        try {
            this.parent = activeEffect;
            activeEffect = this;
            shouldTrack = true;
            cleanupEffect(this);
            return this.fn();
        } finally {
            activeEffect = this.parent;
            shouldTrack = lastShouldTrack;
            this.parent = undefined;
        }
    }
}

export const effect = (fn) => {
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
    trackEffects(dep);
}

export function trackEffects(dep) {
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
                    // 新增
                    if (isMap(target)) {
                        deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
                    }
                } else if (isIntegerKey(key)) {
                    deps.push(depsMap.get('length'))
                }
                break;
            case 'delete':
                if (!isArray(target)) {
                    deps.push(depsMap.get(ITERATE_KEY));
                    // 新增
                    if (isMap(target)) {
                        deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
                    }
                }
                break;
            // 新增
            case 'set':
                if (isMap(target)) {
                    deps.push(depsMap.get(ITERATE_KEY))
                }
                break
        }
    }

    let viewEffects = [];
    for (const dep of deps) {
        if (dep) {
            viewEffects.push(...dep)
        }
    }

    viewEffects = new Set(viewEffects);

    triggerEffects(viewEffects);
}

export function triggerEffects(dep) {
    const depArray = isArray(dep) ? dep : [...dep];
    for (const effect of depArray) {
        effect.run();
    }
}