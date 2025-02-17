import type {AppError} from './errors.js';

type DeferredState<T> =
    | {readonly type: 'fulfilled'; readonly value: T}
    | {readonly type: 'pending'}
    | {readonly type: 'rejected'; readonly reason: AppError};

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

    resolve(value: T) {
        if (this._state.type === 'pending') {
            this._state = {type: 'fulfilled', value: value};
            this._resolve(value);
        }
    }

    reject(error: AppError) {
        if (this._state.type === 'pending') {
            this._state = {type: 'rejected', reason: error};
            this._reject(error);
        }
    }
}
