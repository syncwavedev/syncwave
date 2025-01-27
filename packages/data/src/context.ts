import {Deferred} from './deferred.js';
import {Brand, whenAll} from './utils.js';

export class CancelledError extends Error {}

// todo: make cancel synchronous (without Promises)

export type Cancel = Brand<() => Promise<void>, 'cancel'>;

export class Context {
    static background() {
        return new Context();
    }

    static todo() {
        return Context.background();
    }

    static cancelled = (() => {
        const ctx = new Context();
        ctx._cancelled = true;
        return ctx;
    })();

    private constructor() {}

    private readonly cleaners: Array<() => Promise<void> | void> = [];
    private _cancelled = false;
    private children: Context[] = [];

    get alive() {
        return !this._cancelled;
    }

    async race<T>(promise: Promise<T>, message?: string) {
        const result = await Promise.race([
            this.cancelPromise.then(() => ({type: 'cancel' as const})),
            promise.then(value => ({type: 'value' as const, value})),
        ]);

        if (result.type === 'cancel') {
            throw new CancelledError(message);
        }

        return result.value;
    }

    ensureAlive(message?: string) {
        if (!this.alive) {
            throw new CancelledError(message);
        }
    }

    get cancelPromise() {
        const signal = new Deferred<void>();
        this.cleanup(() => signal.resolve());
        return signal.promise;
    }

    cleanup(cb: () => Promise<void> | void): void {
        if (this._cancelled) {
            cb()?.catch(error => {
                console.error('[ERR] failed to cancel', error);
            });
        } else {
            this.cleaners.push(cb);
        }
    }

    withCancel(): [Context, Cancel] {
        const child = new Context();
        this.children.push(child);
        return [
            child,
            (async () => {
                await child.cancel();
                this.children = this.children.filter(x => x !== child);
            }) as Cancel,
        ];
    }

    private async cancel() {
        if (this._cancelled) {
            return;
        }

        this._cancelled = true;
        await whenAll(this.children.map(x => x.cancel()));
        await whenAll(this.cleaners.map(async cb => cb()));
    }
}
