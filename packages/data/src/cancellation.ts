import {Deferred} from './deferred.js';

export class CancellationError extends Error {}

// todo: make cancel synchronous (without Promises)
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
    static cancelled = (() => {
        const cxs = new CancellationSource();
        cxs.cancel();
        return cxs.cancellation;
    })();
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
            .then(() => cxs.cancel())
            .catch(error => {
                console.error('[ERR] error for combined cx', error);
            });

        return cxs.cancellation;
    }
}
