import {MsgpackCodec} from '../codec.js';
import type {Tuple} from '../tuple.js';
import {pipe} from '../utils.js';
import {type Transaction, withCodec} from './kv-store.js';

const key: Tuple = [];

export class Cell<T> {
    private readonly tx: Transaction<Tuple, {value: T}>;

    constructor(
        tx: Transaction<Tuple, Uint8Array>,
        private readonly initialValue: T
    ) {
        this.tx = pipe(tx, withCodec(new MsgpackCodec()));
    }

    async get(): Promise<T> {
        const result = await this.tx.get(key);
        if (result) {
            return result.value;
        }
        await this.put(this.initialValue);
        return this.initialValue;
    }

    async put(value: T): Promise<void> {
        await this.tx.put(key, {value});
    }
}
