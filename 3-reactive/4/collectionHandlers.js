import { hasOwn, hasChanged, isMap } from './shared.js'
import { toRaw, ReactiveFlags, toReactive, toReadonly } from './reactive.js'
import { track, trigger, ITERATE_KEY, MAP_KEY_ITERATE_KEY } from './effect.js'

const toShallow = (value) => value;

const getProto = (v) => Reflect.getPrototypeOf(v);

const [
    mutableInstrumentations,
    readonlyInstrumentations,
    shallowInstrumentations,
    shallowReadonlyInstrumentations
] = createInstrumentations();

function get(
    target,
    key,
    isReadonly = false,
    isShallow = false
) {
    target = (target)[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const rawKey = toRaw(key)
    if (key !== rawKey) {
        !isReadonly && track(rawTarget, key)
    }
    !isReadonly && track(rawTarget, rawKey)
    const { has } = getProto(rawTarget)
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
    if (has.call(rawTarget, key)) {
        return wrap(target.get(key))
    } else if (has.call(rawTarget, rawKey)) {
        return wrap(target.get(rawKey))
    } else if (target !== rawTarget) {
        target.get(key)
    }
}

function has(key, isReadonly = false) {
    const target = (this)[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const rawKey = toRaw(key)
    if (key !== rawKey) {
        !isReadonly && track(rawTarget, key)
    }
    !isReadonly && track(rawTarget, rawKey)
    return key === rawKey
        ? target.has(key)
        : target.has(key) || target.has(rawKey)
}

function size(target, isReadonly = false) {
    target = (target)[ReactiveFlags.RAW]
    !isReadonly && track(toRaw(target), ITERATE_KEY)
    return Reflect.get(target, 'size', target)
}

function add(value) {
    value = toRaw(value)
    const target = toRaw(this)
    const proto = getProto(target)
    const hadKey = proto.has.call(target, value)
    if (!hadKey) {console.log('add===', value)
        target.add(value)
        trigger(target, value, 'add', value)
    }
    return this
}

function set(key, value) {
    value = toRaw(value)
    const target = toRaw(this)
    const { has, get } = getProto(target)

    let hadKey = has.call(target, key)
    if (!hadKey) {
        key = toRaw(key)
        hadKey = has.call(target, key)
    }

    const oldValue = get.call(target, key)
    target.set(key, value)
    if (!hadKey) {
        trigger(target, key, 'add', value)
    } else if (hasChanged(value, oldValue)) {
        trigger(target, key, 'set', value)
    }
    return this
}

function deleteEntry(key) {
    const target = toRaw(this)
    const { has } = getProto(target)
    let hadKey = has.call(target, key)
    if (!hadKey) {
        key = toRaw(key)
        hadKey = has.call(target, key)
    }

    const result = target.delete(key)
    if (hadKey) {
        trigger(target, key, 'delete')
    }
    return result
}

function clear() {
    const target = toRaw(this)
    const hadItems = target.size !== 0;
    const result = target.clear()
    if (hadItems) {
        trigger(target, undefined, 'clear')
    }
    return result
}

function createForEach(isReadonly, isShallow) {
    return function forEach(callback, thisArg) {
        const observed = this;
        const target = observed[ReactiveFlags.RAW]
        const rawTarget = toRaw(target)
        const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
        !isReadonly && track(rawTarget, ITERATE_KEY)
        return target.forEach((value, key) => {
            return callback.call(thisArg, wrap(value), wrap(key), observed)
        })
    }
}

export const mutableCollectionHandlers = {
    get: createInstrumentationGetter(false, false)
}

export const shallowCollectionHandlers = {
    get: createInstrumentationGetter(false, true)
}

export const readonlyCollectionHandlers = {
    get: createInstrumentationGetter(true, false)
}

export const shallowReadonlyCollectionHandlers =
{
    get: createInstrumentationGetter(true, true)
}


function createInstrumentationGetter(isReadonly, shallow) {
    const instrumentations = shallow
        ? isReadonly
            ? shallowReadonlyInstrumentations
            : shallowInstrumentations
        : isReadonly
            ? readonlyInstrumentations
            : mutableInstrumentations

    return (target, key, receiver) => {
        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly
        } else if (key === ReactiveFlags.RAW) {
            return target
        }

        return Reflect.get(
            hasOwn(instrumentations, key) && key in target
                ? instrumentations
                : target,
            key,
            receiver
        )
    }
}

function createInstrumentations() {
    const mutableInstrumentations = {
        get(key) {
            return get(this, key)
        },
        get size() {
            return size(this)
        },
        has,
        add,
        set,
        delete: deleteEntry,
        clear,
        forEach: createForEach(false, false)
    }

    const shallowInstrumentations = {
        get(key) {
            return get(this, key, false, true)
        },
        get size() {
            return size(this)
        },
        has,
        add,
        set,
        delete: deleteEntry,
        clear,
        forEach: createForEach(false, true)
    }

    const readonlyInstrumentations = {
        get(key) {
            return get(this, key, true)
        },
        get size() {
            return size(this, true)
        },
        has(key) {
            return has.call(this, key, true)
        },
        add: createReadonlyMethod('add'),
        set: createReadonlyMethod('set'),
        delete: createReadonlyMethod('delete'),
        clear: createReadonlyMethod('clear'),
        forEach: createForEach(true, false)
    }

    const shallowReadonlyInstrumentations = {
        get(key) {
            return get(this, key, true, true)
        },
        get size() {
            return size(this, true)
        },
        has(key) {
            return has.call(this, key, true)
        },
        add: createReadonlyMethod('add'),
        set: createReadonlyMethod('set'),
        delete: createReadonlyMethod('delete'),
        clear: createReadonlyMethod('clear'),
        forEach: createForEach(true, true)
    }

    const iteratorMethods = ['keys', 'values', 'entries', Symbol.iterator]
    iteratorMethods.forEach(method => {
        mutableInstrumentations[method] = createIterableMethod(
            method,
            false,
            false
        )
        readonlyInstrumentations[method] = createIterableMethod(
            method,
            true,
            false
        )
        shallowInstrumentations[method] = createIterableMethod(
            method,
            false,
            true
        )
        shallowReadonlyInstrumentations[method] = createIterableMethod(
            method,
            true,
            true
        )
    })

    return [
        mutableInstrumentations,
        readonlyInstrumentations,
        shallowInstrumentations,
        shallowReadonlyInstrumentations
    ]
}

function createIterableMethod(
    method,
    isReadonly,
    isShallow
) {
    return function (...args) {
        const target = (this)[ReactiveFlags.RAW]
        const rawTarget = toRaw(target)
        const targetIsMap = isMap(rawTarget)
        const isPair =
            method === 'entries' || (method === Symbol.iterator && targetIsMap)
        const isKeyOnly = method === 'keys' && targetIsMap
        const innerIterator = target[method](...args)
        const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive

        !isReadonly &&
            track(
                rawTarget,
                isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY
            )
        // return a wrapped iterator which returns observed versions of the
        // values emitted from the real iterator
        return {
            // iterator protocol
            next() {
                const { value, done } = innerIterator.next()
                return done
                    ? { value, done }
                    : {
                        value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
                        done
                    }
            },
            // iterable protocol
            [Symbol.iterator]() {
                return this
            }
        }
    }
}

function createReadonlyMethod(type) {
    return function () {
        return type === 'delete' ? false : this
    }
}

