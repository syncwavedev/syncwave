import {MsgpackrCodec} from '../codec.js';
import {pipe} from '../utils.js';
import {Transaction, Uint8Transaction, withValueCodec} from './kv-store.js';

const key = new Uint8Array();

export class Cell<T> {
    private readonly tx: Transaction<Uint8Array, T>;

    constructor(
        tx: Uint8Transaction,
        private readonly initialValue: T
    ) {
        this.tx = pipe(tx, withValueCodec(new MsgpackrCodec()));
    }

    async get(): Promise<T> {
        return (await this.tx.get(key)) ?? this.initialValue;
    }

    async put(value: T): Promise<void> {
        await this.tx.put(key, value);
    }
}
