import {Transaction, Uint8Transaction, withValueSerializer} from '../kv/kv-store';
import {MsgpackrSerializer} from '../msgpackr-serializer';
import {pipe} from '../utils';

const key = new Uint8Array();

export class Cell<T> {
    private readonly txn: Transaction<Uint8Array, T>;

    constructor(
        txn: Uint8Transaction,
        private readonly initialValue: T
    ) {
        this.txn = pipe(txn, withValueSerializer(new MsgpackrSerializer()));
    }

    async get(): Promise<T> {
        return (await this.txn.get(key)) ?? this.initialValue;
    }

    async put(value: T): Promise<void> {
        await this.txn.put(key, value);
    }
}
