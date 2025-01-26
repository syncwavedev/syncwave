import {z} from 'zod';
import {astream, AsyncStream} from './async-stream.js';
import {Deferred} from './deferred.js';
import {
    AggregateBusinessError,
    AggregateError,
    BusinessError,
} from './errors.js';

export type Brand<T, B> = T & {__brand: B | undefined};

export type Unsubscribe = () => void;

export interface Observer<T> {
    next: (value: T) => Promise<void>;
    throw: (error: any) => Promise<void>;
    close: () => Promise<void>;
}

export class Subject<
    TValue,
    TObserver extends Observer<TValue> = Observer<TValue>,
> {
    private subs: Array<{observer: TObserver}> = [];
    private _open = true;

    get open() {
        return this._open;
    }

    get observers(): TObserver[] {
        return this.subs.map(x => x.observer);
    }

    subscribe(observer: TObserver): Unsubscribe {
        this.ensureOpen();

        // wrap if the same observer is used twice for subscription, so unsubscribe wouldn't filter both out
        const sub = {observer};

        this.subs.push(sub);

        return () => {
            this.subs = this.subs.filter(x => x !== sub);
        };
    }

    async next(value: TValue): Promise<void> {
        this.ensureOpen();
        // copy in case if new subscribers are added/removed during notification
        await whenAll([...this.subs].map(sub => sub.observer.next(value)));
    }

    async throw(error: Error): Promise<void> {
        this.ensureOpen();
        // copy in case if new subscribers are added/removed during notification
        await whenAll([...this.subs].map(sub => sub.observer.throw(error)));
    }

    async close(): Promise<void> {
        if (this._open) {
            this._open = false;
            // copy in case if new subscribers are added/removed during notification
            await whenAll([...this.subs].map(sub => sub.observer.close()));
        } else {
            console.warn('[WRN] subject already closed');
        }
    }

    private ensureOpen() {
        if (!this._open) {
            throw new Error('subject is closed');
        }
    }
}

export function assertNever(value: never): never {
    throw new Error('assertNever failed: ' + value);
}

export function assert(expression: boolean): asserts expression {
    if (!expression) {
        throw new Error('assertion failed');
    }
}

export function assertDefined<T>(value: T | undefined | null): T {
    if (value === null || value === undefined) {
        throw new Error('assertion failed: value is not defined');
    }

    return value;
}

export function wait(ms: number, cx?: Cancellation): Promise<void> {
    return new Promise(resolve => {
        const timeoutId = setTimeout(resolve, ms);
        cx
            ?.then(() => clearTimeout(timeoutId))
            .catch(error => {
                console.error('[ERR] failed to clear timeout', error);
            });
    });
}

export function interval(ms: number, cx: Cancellation): AsyncStream<number> {
    return astream(_interval(ms, cx));
}

async function* _interval(ms: number, cx: Cancellation): AsyncIterable<number> {
    let index = 0;
    while (!cx.isCancelled) {
        yield index;
        index += 1;
        await wait(ms, cx);
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
    assert(a.length === b.length);

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
    throw new Error('unreachable');
}

export function unimplemented(): never {
    throw new Error('unimplemented');
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

/**
 * In contrast to Promise.all, whenAll waits for all rejections and combines them into AggregateError
 */
export async function whenAll<const T extends Promise<any>[]>(
    promises: T
): ReturnType<typeof Promise.all<T>> {
    const result = await Promise.allSettled(promises);
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
        } else {
            throw new AggregateError(rejected.map(x => x.reason));
        }
    }
}

export function zUint8Array() {
    return z.custom<Uint8Array>(x => x instanceof Uint8Array, {
        message: 'Uint8Array expected',
    });
}

export class CancellationSource {
    private readonly signal = new Deferred<void>();

    get cancellation() {
        return new Cancellation(this, this.signal.promise);
    }

    get isCancelled() {
        return this.signal.state === 'fulfilled';
    }

    cancel() {
        this.signal.resolve();
    }
}

export class Cancellation {
    static none = new CancellationSource().cancellation;
    constructor(
        private readonly cxs: CancellationSource,
        private signal: Promise<void>
    ) {}

    get isCancelled() {
        return this.cxs.isCancelled;
    }

    async then<T>(cb: () => PromiseLike<T> | T) {
        return await this.signal.then(cb);
    }

    combine(cx: Cancellation): Cancellation {
        const cxs = new CancellationSource();
        Promise.race([cx, this])
            .then(() => cxs.cancel)
            .catch(error => {
                console.error('[ERR] error for combined cx', error);
            });

        return cxs.cancellation;
    }
}
