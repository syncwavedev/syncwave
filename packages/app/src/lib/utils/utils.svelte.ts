import {onDestroy} from 'svelte';
import type {Readable, Subscriber} from 'svelte/store';
import {
    assert,
    BusinessError,
    CancelledError,
    Deferred,
    log,
    runAll,
    toStream,
    wait,
    type CoordinatorRpc,
    type Stream,
} from 'syncwave';
import router from '../router';
import {getRpc} from './utils';

// observable is wrapped in $state, so it can be used in templates directly
export interface Observable<T> extends Readable<T> {
    value: T;
}

interface ObservableController<T> {
    observable: Observable<T>;
    next(this: void, value: T): void;
    end(this: void): void;
}

export function mapObservable<T, R>(
    observable: Observable<T>,
    mapper: (value: T) => R
): Observable<R> {
    const result = createObservable(mapper(observable.value));

    const unsub = observable.subscribe(
        value => result.next(mapper(value)),
        () => result.end()
    );
    onDestroy(unsub);

    return result.observable;
}

function createObservable<T>(initialValue: T): ObservableController<T> {
    let subs: Array<{
        run: (value: T) => void;
        invalidate: (() => void) | undefined;
    }> = [];

    const subscribe = (run: Subscriber<T>, invalidate?: () => void) => {
        run(observable.value);

        const sub = {run, invalidate};
        subs.push(sub);

        return () => {
            subs = subs.filter(x => x !== sub);
        };
    };

    const observable: Observable<T> = $state({
        value: initialValue,
        subscribe,
    });

    let open = true;

    const next = (value: T) => {
        assert(open, 'observable is closed');
        observable.value = value;
        runAll(subs.map(x => () => x.run(value)));
    };

    const end = () => {
        if (!open) return;
        open = false;
        runAll(subs.map(x => () => x.invalidate?.()));
    };

    return {observable, next, end};
}

export async function observeAsync<T>(
    fn: (rpc: CoordinatorRpc) => AsyncIterable<T>
): Promise<Observable<T>> {
    const result = new Deferred<Observable<T>>();
    let controller: ObservableController<T> | undefined = undefined;

    useStream(
        fn,
        value => {
            if (controller) {
                controller.next(value);
            } else {
                controller = createObservable(value);
                result.resolve(controller.observable);
            }
        },
        () => {
            controller?.end();
        }
    );

    return result.promise;
}

export function observe<T>(
    initialValue: T,
    fn: (rpc: CoordinatorRpc) => Stream<T>
): Observable<T> {
    const controller = createObservable(initialValue);

    useStream(fn, controller.next, controller.end);

    return controller.observable;
}

function useStream<T>(
    fn: (rpc: CoordinatorRpc) => AsyncIterable<T>,
    onNext: (value: T) => void,
    onDone: () => void
) {
    const rpc = getRpc();

    let cancelled = false;
    (async function retry() {
        try {
            while (!cancelled) {
                try {
                    const value$ = rpc(x => {
                        return toStream(fn(x));
                    });

                    for await (const value of value$) {
                        if (cancelled) {
                            break;
                        }
                        onNext(value);
                    }
                } catch (error) {
                    if (!cancelled) {
                        log.error({error, msg: 'observable failed'});
                    }
                    if (error instanceof CancelledError) return;
                    if (error instanceof BusinessError) {
                        if (error.code === 'forbidden') {
                            log.error({msg: 'Access denied'});
                            router.route('/');
                        }
                        return;
                    }
                }

                await wait({ms: 1000, onCancel: 'resolve'});
            }
        } finally {
            onDone();
        }
    })();

    onDestroy(() => {
        cancelled = true;
    });
}
