import {MsgpackrCodec} from '../codec.js';
import {pipe} from '../utils.js';
import {Transaction, Uint8Transaction, withValueCodec} from './kv-store.js';

const key = new Uint8Array();

export class Cell<T> {
    private readonly txn: Transaction<Uint8Array, T>;

    constructor(
        txn: Uint8Transaction,
        private readonly initialValue: T
    ) {
        this.txn = pipe(txn, withValueCodec(new MsgpackrCodec()));
    }

    async get(): Promise<T> {
        return (await this.txn.get(key)) ?? this.initialValue;
    }

    async put(value: T): Promise<void> {
        await this.txn.put(key, value);
    }
}
