import {z} from 'zod';
import {CancelBehavior, context} from './context.js';
import {Deferred} from './deferred.js';
import {
    AggregateBusinessError,
    AggregateCancelledError,
    AggregateError,
    AppError,
    BusinessError,
    CancelledError,
} from './errors.js';
import {Stream, toStream} from './stream.js';

export type Brand<T, B> = T & {__brand: () => B | undefined};

export type Nothing = void | undefined;

export type Unsubscribe = () => void;

export function assertNever(value: never): never {
    throw new AppError('assertNever failed: ' + value);
}

export function assert(
    expression: boolean,
    message: string
): asserts expression {
    if (!expression) {
        throw new AppError('assertion failed: ' + message);
    }
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
        cancelCleanup();
    }, ms);

    const cancelCleanup = context().onEnd(reason => {
        clearTimeout(timeoutId);

        if (cancelBehavior === 'reject') {
            result.reject(new CancelledError('wait cancelled', reason));
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
        cancelCleanup();
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

export async function whenAny<T>(promises: Promise<T>[]) {
    if (promises.length === 0) {
        return [];
    }

    const withId = promises.map((promise, idx) =>
        promise.then(result => ({result, idx}))
    );
    const racer = await Promise.race(withId);

    return [
        racer.result,
        promises.filter((_, idx) => idx !== racer.idx),
    ] as const;
}

export function zUint8Array() {
    return z.custom<Uint8Array>(x => x instanceof Uint8Array, {
        message: 'Uint8Array expected',
    });
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

export function stringify(x: unknown) {
    if (x === undefined) {
        return 'undefined';
    } else if (x === null) {
        return 'null';
    } else {
        return x.toString();
    }
}

export function drop<T>(_: T) {}
