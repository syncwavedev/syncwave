import {MsgpackCodec} from '../codec.js';
import {Cx} from '../context.js';
import {pipe} from '../utils.js';
import {Transaction, Uint8Transaction, withValueCodec} from './kv-store.js';

const key = new Uint8Array();

export class Cell<T> {
    private readonly tx: Transaction<Uint8Array, {value: T}>;

    constructor(
        tx: Uint8Transaction,
        private readonly initialValue: T
    ) {
        this.tx = pipe(tx, withValueCodec(new MsgpackCodec()));
    }

    async get(cx: Cx): Promise<T> {
        const result = await this.tx.get(cx, key);
        if (result) {
            return result.value;
        }
        [cx, x] = await this.put(cx, this.initialValue);
        return this.initialValue;
    }

    async put(cx: Cx, value: T): Promise<[Cx, void]> {
        await this.tx.put(cx, key, {value});

        return [cx, undefined];
    }
}
