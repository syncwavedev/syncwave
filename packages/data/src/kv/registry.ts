import {AppError} from '../errors.js';
import {type Uint8Transaction, withPrefix} from './kv-store.js';

export class Registry<T> {
    constructor(
        private readonly tx: Uint8Transaction,
        private readonly factory: (tx: Uint8Transaction) => T
    ) {}

    get(name: string): T {
        if (name.indexOf('/') !== -1) {
            throw new AppError('invalid item name, / is not allowed');
        }

        return this.factory(withPrefix(`t/${name}/`)(this.tx));
    }
}
