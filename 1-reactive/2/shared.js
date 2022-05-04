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