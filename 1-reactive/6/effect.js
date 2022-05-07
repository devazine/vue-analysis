import { isArray, isIntegerKey } from './shared.js'

const targetMap = new WeakMap();
export const ITERATE_KEY = Symbol();

export let shouldTrack = true;
const trackStack = [];

let viewEffect;

export const setViewEffect = (fn) => {
    viewEffect = fn;
    fn();
}

export function pauseTracking() {
    trackStack.push(shouldTrack)
    shouldTrack = false
}

export function resetTracking() {
    const last = trackStack.pop()
    shouldTrack = last === undefined ? true : last
}

export const track = (target, key) => {
    if (!shouldTrack || !viewEffect) return;
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, (dep = new Set()));
    }

    dep.add(viewEffect);
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

    viewEffects.forEach(effectFn => {
        effectFn && effectFn()
    });
}