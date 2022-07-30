export const isObject = val => {
    return val !== null && typeof val === 'object'
}

export const isArray = Array.isArray;

const hasOwnProperty = Object.prototype.hasOwnProperty;
export const hasOwn = (target, key) => hasOwnProperty.call(target, key);

export const isString = (val) => typeof val === 'string';

export const isIntegerKey = (key) =>
    isString(key) &&
    key !== 'NaN' &&
    key[0] !== '-' &&
    '' + parseInt(key, 10) === key

export const hasChanged = (value, oldValue) =>
    !Object.is(value, oldValue)

export const isSymbol = (val) => typeof val === 'symbol'

export const def = (obj, key, value) => {
    Object.defineProperty(obj, key, {
        configurable: true,
        enumerable: false,
        value
    })
}

const cacheStringFunction = (fn) => {
    const cache = Object.create(null)
    return ((str) => {
      const hit = cache[str]
      return hit || (cache[str] = fn(str))
    })
  }

export const capitalize = cacheStringFunction(
    (str) => str.charAt(0).toUpperCase() + str.slice(1)
)

export const toRawType = (value) => {
    // 从类似 "[object RawType]" 的字符串中抽取出 "RawType"
    return toTypeString(value).slice(8, -1)
}

export const objectToString = Object.prototype.toString
export const toTypeString = (value) =>
  objectToString.call(value)

export const isMap = (val) =>
    toTypeString(val) === '[object Map]'
export const isSet = (val) =>
    toTypeString(val) === '[object Set]'