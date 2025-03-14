import {context, type CancelBehavior} from './context.js';
import {Deferred} from './deferred.js';
import {
    AggregateBusinessError,
    AggregateCancelledError,
    AggregateError,
    AppError,
    BusinessError,
    CancelledError,
    toError,
} from './errors.js';
import {log} from './logger.js';
import {Stream, toStream} from './stream.js';

export type Brand<T, B> = T & {__brand: () => B | undefined};

export type Nothing = void | undefined;

export type Unsubscribe = (reason: unknown) => void;

export function assertNever(value: never): never {
    throw new AppError('assertNever failed: ' + value);
}

export function softNever(value: never, reason: string): void {
    log.warn(
        `the app is outdated, softNever (${reason}) got called with: ${JSON.stringify(value)}`
    );
}

export type AssertMessage = string | (() => string);

function renderAssertMessage(message: AssertMessage): string {
    if (typeof message === 'function') {
        return message();
    } else {
        return message;
    }
}

export function assert(
    expression: boolean,
    message: AssertMessage
): asserts expression {
    if (!expression) {
        throw new AppError('assertion failed: ' + renderAssertMessage(message));
    }
}

export function assertSingle<T>(value: T[], message: AssertMessage): T {
    if (value.length !== 1) {
        throw new AppError(
            'assertSingle failed: ' + renderAssertMessage(message)
        );
    }

    return value[0];
}

export function assertDefined<T>(value: T | undefined | null): T {
    if (value === null || value === undefined) {
        throw new AppError('assertion failed: value is not defined');
    }

    return value;
}

export interface WaitOptions {
    ms: number;
    onCancel: CancelBehavior;
}

export function wait({
    ms,
    onCancel: cancelBehavior,
}: WaitOptions): Promise<void> {
    const result = new Deferred<void>();
    const timeoutId = setTimeout(() => {
        result.resolve();
        cancelCleanup('wait timeout');
    }, ms);

    const cancelCleanup = context().onEnd(reason => {
        clearTimeout(timeoutId);

        if (cancelBehavior === 'reject') {
            result.reject(toError(reason));
        } else if (cancelBehavior === 'resolve') {
            result.resolve();
        } else if (cancelBehavior === 'suspend') {
            // do nothing
        } else {
            assertNever(cancelBehavior);
        }
    });
    return result.promise;
}

export function isCancelledError(error: unknown): boolean {
    return (
        error instanceof CancelledError ||
        (error instanceof AppError && isCancelledError(error.cause))
    );
}

export async function catchCancel<T>(promise: Promise<T>): Promise<T | void> {
    try {
        return await promise;
    } catch (error) {
        if (isCancelledError(error)) {
            return;
        }
        return await Promise.reject(error);
    }
}

export interface IntervalOptions {
    ms: number;
    onCancel: CancelBehavior;
}

export function interval(options: IntervalOptions): Stream<number> {
    return toStream(_interval(options));
}

async function* _interval({
    ms,
    onCancel: cancelBehavior,
}: IntervalOptions): AsyncIterable<number> {
    let index = 0;
    let cancelled = false;
    const cancelCleanup = context().onEnd(() => {
        cancelled = true;
    });
    try {
        while (!cancelled) {
            yield index;
            index += 1;
            await wait({ms, onCancel: cancelBehavior});
        }
    } finally {
        cancelCleanup('internal finally');
    }

    if (cancelBehavior === 'reject') {
        throw new CancelledError('interval cancelled', undefined);
    } else if (cancelBehavior === 'suspend') {
        await new Promise(() => {});
    } else if (cancelBehavior === 'resolve') {
        // do nothing
    } else {
        assertNever(cancelBehavior);
    }
}

export function pipe<T>(x: T): T;
export function pipe<T, R>(x: T, fn1: (x: T) => R): R;
export function pipe<T, A, R>(x: T, fn1: (x: T) => A, fn2: (arg: A) => R): R;
export function pipe<T, A, B, R>(
    x: T,
    fn1: (x: T) => A,
    fn2: (arg: A) => B,
    fn3: (arg: B) => R
): R;
export function pipe<T, A, B, C, R>(
    x: T,
    fn1: (x: T) => A,
    fn2: (arg: A) => B,
    fn3: (arg: B) => C,
    fn4: (arg: C) => R
): R;
export function pipe<T, A, B, C, D, R>(
    x: T,
    fn1: (x: T) => A,
    fn2: (arg: A) => B,
    fn3: (arg: B) => C,
    fn4: (arg: C) => D,
    fn5: (arg: D) => R
): R;
export function pipe<T, A, B, C, D, E, R>(
    x: T,
    fn1: (x: T) => A,
    fn2: (arg: A) => B,
    fn3: (arg: B) => C,
    fn4: (arg: C) => D,
    fn5: (arg: D) => E,
    fn6: (arg: E) => R
): R;
export function pipe<T, A, B, C, D, E, F, R>(
    x: T,
    fn1: (x: T) => A,
    fn2: (arg: A) => B,
    fn3: (arg: B) => C,
    fn4: (arg: C) => D,
    fn5: (arg: D) => E,
    fn6: (arg: E) => F,
    fn7: (arg: F) => R
): R;
export function pipe<T, A, B, C, D, E, F, G, R>(
    x: T,
    fn1: (x: T) => A,
    fn2: (arg: A) => B,
    fn3: (arg: B) => C,
    fn4: (arg: C) => D,
    fn5: (arg: D) => E,
    fn6: (arg: E) => F,
    fn7: (arg: F) => G,
    fn8: (arg: G) => R
): R;
export function pipe<T>(x: T, ...fns: Function[]): any {
    if (fns.length === 0) {
        return x;
    }
    return fns.reduce((prevResult, fn) => fn(prevResult), x as unknown);
}

export function concatBuffers(a: Uint8Array, b: Uint8Array): Uint8Array {
    const mergedArray = new Uint8Array(a.length + b.length);
    mergedArray.set(a);
    mergedArray.set(b, a.length);

    return mergedArray;
}

export function distinct<T>(items: T[]): T[] {
    return [...new Set(items).values()];
}

export function zip<T1, T2>(a: readonly T1[], b: readonly T2[]): [T1, T2][] {
    assert(a.length === b.length, 'zip: lengths are different');

    const result: [T1, T2][] = [];
    for (let i = 0; i < a.length; i += 1) {
        result.push([a[i], b[i]]);
    }

    return result;
}

export function compareUint8Array(a: Uint8Array, b: Uint8Array): 1 | 0 | -1 {
    const minLength = Math.min(a.length, b.length);

    for (let i = 0; i < minLength; i++) {
        if (a[i] < b[i]) return -1;
        if (a[i] > b[i]) return 1;
    }

    if (a.length < b.length) return -1;
    if (a.length > b.length) return 1;

    return 0;
}

export function bufStartsWith(buf: Uint8Array, prefix: Uint8Array): boolean {
    const bufPrefix = buf.slice(0, prefix.length);
    return compareUint8Array(bufPrefix, prefix) === 0;
}

export function unreachable(): never {
    throw new AppError('unreachable');
}

export function unimplemented(): never {
    throw new AppError('unimplemented');
}

export function arrayEqual<T>(a: T[], b: T[]) {
    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
}

function aggregateSettled<const T extends PromiseSettledResult<unknown>[]>(
    result: T
): T[number] {
    const rejected = result.filter(x => x.status === 'rejected');

    if (rejected.length === 0) {
        return result
            .filter(x => x.status === 'fulfilled')
            .map(x => x.value) as any;
    } else if (rejected.length === 1) {
        throw rejected[0].reason;
    } else {
        if (rejected.every(x => x.reason instanceof BusinessError)) {
            throw new AggregateBusinessError(rejected.map(x => x.reason));
        } else if (rejected.every(x => x.reason instanceof CancelledError)) {
            throw new AggregateCancelledError(rejected.map(x => x.reason));
        } else {
            throw new AggregateError(rejected.map(x => x.reason));
        }
    }
}

/**
 * runs each function in order and throws AggregateError if any function throws
 * @param fns functions to run
 */
export function runAll<const T extends Array<() => unknown>>(fns: T): void {
    aggregateSettled(
        fns.map(fn => {
            try {
                fn();
                return {status: 'fulfilled', value: undefined};
            } catch (reason) {
                return {status: 'rejected', reason};
            }
        })
    );
}

/**
 * In contrast to Promise.all, whenAll waits for all rejections and combines them into AggregateError
 */
export async function whenAll<const T extends Promise<any>[]>(
    promises: T
): ReturnType<typeof Promise.all<T>> {
    const result = await Promise.allSettled(promises);
    return aggregateSettled(result) as unknown as ReturnType<
        typeof Promise.all<T>
    >;
}

export function run<R>(fn: () => R) {
    return fn();
}

export function getRequiredKey<T, K extends keyof T>(
    obj: T,
    key: K,
    error: AppError
): T[K] {
    const value = obj[key];
    if (value === undefined) {
        throw error;
    }
    return value;
}

export function drop<T>(_: T) {}

export function shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function partition<T, S extends T>(
    items: T[],
    predicate: (value: T) => value is S
): [Array<S>, Array<Exclude<T, S>>];
export function partition<T>(
    items: T[],
    predicate: (value: T) => Promise<boolean> | boolean
): [Array<T>, Array<T>];
export function partition<T, S extends T>(
    items: T[],
    predicate:
        | ((value: T) => value is S)
        | ((value: T) => Promise<boolean> | boolean)
): [Array<S>, Array<Exclude<T, S>>] | [Array<T>, Array<T>] {
    const truthyItems: T[] = [];
    const falsyItems: T[] = [];

    for (const item of items) {
        if (predicate(item)) {
            truthyItems.push(item);
        } else {
            falsyItems.push(item);
        }
    }

    return [truthyItems, falsyItems];
}

export function equals(a: unknown, b: unknown): boolean {
    if (a === b) {
        return true;
    }

    if (typeof a !== typeof b) {
        return false;
    }

    if (a === null || b === null) {
        return false;
    }

    if (typeof a === 'object' && typeof b === 'object') {
        if (a instanceof Uint8Array && b instanceof Uint8Array) {
            if (a.length !== b.length) {
                return false;
            }
            for (let i = 0; i < a.length; i++) {
                if (a[i] !== b[i]) {
                    return false;
                }
            }
            return true;
        } else if (a instanceof Date && b instanceof Date) {
            return a.getTime() === b.getTime();
        } else if (a instanceof RegExp && b instanceof RegExp) {
            return a.source === b.source && a.flags === b.flags;
        } else if (a instanceof Set && b instanceof Set) {
            if (a.size !== b.size) {
                return false;
            }
            for (const item of a) {
                if (!b.has(item)) {
                    return false;
                }
            }
            return true;
        } else if (a instanceof Map && b instanceof Map) {
            if (a.size !== b.size) {
                return false;
            }
            for (const [key, value] of a) {
                if (!b.has(key) || !equals(value, b.get(key))) {
                    return false;
                }
            }
            return true;
        } else if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) {
                return false;
            }
            for (let i = 0; i < a.length; i++) {
                if (!equals(a[i], b[i])) {
                    return false;
                }
            }
            return true;
        } else {
            const aKeys = Object.keys(a);
            const bKeys = Object.keys(b);
            if (aKeys.length !== bKeys.length) {
                return false;
            }
            for (const key of aKeys) {
                if (
                    !bKeys.includes(key) ||
                    !equals((a as any)[key], (b as any)[key])
                ) {
                    return false;
                }
            }
            return true;
        }
    }

    return false;
}

export function hashString(s: string) {
    let hash = 0;
    if (s.length === 0) return hash;
    for (let i = 0; i < s.length; i++) {
        const chr = s.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
