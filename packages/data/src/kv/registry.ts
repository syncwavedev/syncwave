import {Cx} from '../context.js';
import {AppError} from '../errors.js';
import {Uint8Transaction, withPrefix} from './kv-store.js';

export class Registry<T> {
    constructor(
        private readonly tx: Uint8Transaction,
        private readonly factory: (tx: Uint8Transaction) => T
    ) {}

    get(cx: Cx, name: string): T {
        if (name.indexOf('/') !== -1) {
            throw new AppError(cx, 'invalid item name, / is not allowed');
        }

        return this.factory(withPrefix(cx, `t/${name}/`)(this.tx));
    }
}
