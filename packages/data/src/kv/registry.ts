import {AppError} from '../errors.js';
import {type AppTransaction, isolate} from './kv-store.js';

export class Registry<T> {
    constructor(
        private readonly tx: AppTransaction,
        private readonly factory: (tx: AppTransaction) => T
    ) {}

    get(name: string): T {
        if (name.indexOf('/') !== -1) {
            throw new AppError('invalid item name, / is not allowed');
        }

        return this.factory(isolate(['t', name])(this.tx));
    }
}
