import {AppError} from '../errors.js';
import type {Timestamp} from '../timestamp.js';
import {equals, whenAll} from '../utils.js';

export type TransitionChecker<T> = (
    prev: T | undefined,
    next: T
) => Promise<{errors: string[]}>;

export type WritableDescriptor<T> = {
    [K in keyof T]-?: boolean;
};

class ExpectAny<T> {
    constructor(public readonly ctor: new () => T) {}
}

class ExpectOptional<T> {
    constructor(public readonly value: T) {}
}

class ExpectDiscriminatedUnion {
    constructor(public readonly values: Record<string, unknown>) {}
}

function expectAny<T>(ctor: new () => T): T {
    return new ExpectAny(ctor) as T;
}

export function expectBoolean() {
    return expectAny(Boolean) as boolean;
}

export function expectNumber() {
    return expectAny(Number) as number;
}

export function expectString<T extends string = string>() {
    return expectAny(String) as T;
}

export function expectTimestamp() {
    return expectAny(Number) as Timestamp;
}

export function expectOptional<T>(value: T): T | undefined {
    return new ExpectOptional(value) as T | undefined;
}

export function expectUnion<const T extends Record<string, {type: string}>>(
    values: T
): T[keyof T] {
    return new ExpectDiscriminatedUnion(values) as any;
}

interface ValidationError {
    path: string[];
    message: string;
}

function validateCondition(
    valid: boolean,
    error: ValidationError
): ValidationError[] {
    if (valid) {
        return [];
    }
    return [error];
}

function validate<T>(value: T, expected: T): ValidationError[] {
    if (expected instanceof ExpectOptional) {
        if (value === undefined) {
            return [];
        }

        return validate(value, expected.value);
    } else if (expected instanceof ExpectDiscriminatedUnion) {
        if (typeof value !== 'object' || value === null) {
            return [{path: [], message: 'expected object'}];
        }

        if (!('type' in value) || typeof value.type !== 'string') {
            return [
                {
                    path: ['type'],
                    message:
                        'expected type property to be string, but got ' +
                        typeof (value as Record<string, unknown>).type,
                },
            ];
        }

        return validate(value, expected.values[value.type]);
    } else if (expected instanceof ExpectAny) {
        if (expected.ctor === String) {
            return validateCondition(typeof value === 'string', {
                message: `expected string, but got ${typeof value}`,
                path: [],
            });
        } else if (expected.ctor === Number) {
            return validateCondition(typeof value === 'number', {
                message: `expected number, but got ${typeof value}`,
                path: [],
            });
        } else if (expected.ctor === Boolean) {
            return validateCondition(typeof value === 'boolean', {
                message: `expected boolean, but got ${typeof value}`,
                path: [],
            });
        } else {
            return validateCondition(value instanceof expected.ctor, {
                message: `expected ${expected.ctor.name}, but got ${typeof value}`,
                path: [],
            });
        }
    } else {
        if (
            typeof expected === 'bigint' ||
            typeof expected === 'number' ||
            typeof expected === 'string' ||
            typeof expected === 'boolean' ||
            typeof expected === 'undefined' ||
            typeof expected === 'symbol'
        ) {
            return validateCondition(value === expected, {
                message: `expected ${JSON.stringify(expected)}, but got ${JSON.stringify(value)}`,
                path: [],
            });
        } else if (Array.isArray(expected)) {
            if (!Array.isArray(value)) {
                return validateCondition(false, {
                    message: `expected array, but got ${typeof value}`,
                    path: [],
                });
            }

            if (expected.length !== value.length) {
                return validateCondition(false, {
                    message: `expected array of length ${expected.length}, but got ${value.length}`,
                    path: [],
                });
            }

            const errors: ValidationError[] = [];

            for (let i = 0; i < expected.length; i++) {
                const expectedValue = expected[i];
                const valueValue = value[i];

                errors.push(
                    ...validate(valueValue, expectedValue).map(error => ({
                        ...error,
                        path: [String(i), ...error.path],
                    }))
                );
            }

            return errors;
        } else if (typeof expected === 'object') {
            if (expected === null) {
                return validateCondition(value === null, {
                    message: `expected null, but got ${typeof value}`,
                    path: [],
                });
            }

            if (typeof value !== 'object' || value === null) {
                return validateCondition(false, {
                    message: `expected object, but got ${typeof value}`,
                    path: [],
                });
            }

            const keys = new Set([
                ...Object.keys(expected),
                ...Object.keys(value),
            ]);

            const errors: ValidationError[] = [];

            for (const key of keys) {
                if (typeof key !== 'string') {
                    throw new AppError(
                        'property (with non-string name) modification is not allowed: ' +
                            String(key)
                    );
                }

                const expectedValue = (expected as Record<string, any>)[key];
                const valueValue = (value as Record<string, any>)[key];

                errors.push(
                    ...validate(valueValue, expectedValue).map(error => ({
                        ...error,
                        path: [key, ...error.path],
                    }))
                );
            }

            return errors;
        } else {
            throw new AppError(
                `Unexpected type of expected value: ${typeof expected}`
            );
        }
    }
}

export function creatable<T>(expected: T): TransitionChecker<T> {
    return async (prev, next) => {
        if (prev !== undefined) {
            return {
                errors: ['object is not creatable, because it already exists'],
            };
        }

        const errors = validate(next, expected);
        return {
            errors: errors.map(error => {
                return `'${error.path.join('.')}' is invalid: ${error.message}`;
            }),
        };
    };
}

export function writable<T extends object>(
    writable: WritableDescriptor<T>
): TransitionChecker<T> {
    return async (prev: T | undefined, next: T) => {
        if (prev === undefined) {
            return {errors: []};
        }
        const keys = new Set([
            ...Object.keys(prev),
            ...Object.keys(next),
        ]) as Set<keyof T>;
        const errors: string[] = [];
        for (const key of keys) {
            if (typeof key !== 'string') {
                throw new AppError(
                    'property (with non-string name) modification is not allowed: ' +
                        String(key)
                );
            }

            if (
                (writable as Record<string, any>)[key] !== true &&
                !equals(prev[key], next[key])
            ) {
                errors.push(`property ${key} is readonly`);
            }
        }

        return {errors};
    };
}

export function combineTransitionCheckers<T>(
    checkers: Array<TransitionChecker<T>>
): TransitionChecker<T> {
    return checkers.reduce<TransitionChecker<T>>(
        (a, b) => async (prev: T | undefined, next: T) => {
            const [aResult, bResult] = await whenAll([
                a(prev, next),
                b(prev, next),
            ]);
            const errors: string[] = [];
            if (aResult) errors.push(...aResult.errors);
            if (bResult) errors.push(...bResult.errors);

            return {errors};
        },
        () => Promise.resolve({errors: []})
    );
}
