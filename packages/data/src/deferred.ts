import {Cx} from './context.js';
import {AppError} from './errors.js';

type DeferredState<T> =
    | {readonly type: 'fulfilled'; readonly value: T}
    | {readonly type: 'pending'}
    | {readonly type: 'rejected'; readonly reason: any};

export class Deferred<T> {
    private _state: DeferredState<T> = {type: 'pending'};

    private _resolve!: (value: T) => void;
    private _reject!: (error: AppError) => void;

    public readonly promise: Promise<T>;

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    get state() {
        return this._state.type;
    }

    resolve(cx: Cx, value: T) {
        if (this._state.type === 'pending') {
            this._state = {type: 'fulfilled', value};
            this._resolve(value);
        }
    }

    reject(cx: Cx, reason: AppError) {
        if (this._state.type === 'pending') {
            this._state = {type: 'rejected', reason};
            this._reject(new AppError(cx, 'Deferred.reject', {cause: reason}));
        }
    }
}
