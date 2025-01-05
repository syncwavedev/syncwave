import {MsgpackrEncoder} from '../encoder';
import {pipe} from '../utils';
import {Transaction, Uint8Transaction, withValueEncoder} from './kv-store';

const key = new Uint8Array();

export class Cell<T> {
    private readonly txn: Transaction<Uint8Array, T>;

    constructor(
        txn: Uint8Transaction,
        private readonly initialValue: T
    ) {
        this.txn = pipe(txn, withValueEncoder(new MsgpackrEncoder()));
    }

    async get(): Promise<T> {
        return (await this.txn.get(key)) ?? this.initialValue;
    }

    async put(value: T): Promise<void> {
        await this.txn.put(key, value);
    }
}
