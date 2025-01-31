import {encodeString} from '../codec.js';
import {Cx} from '../context.js';
import {compareUint8Array, concatBuffers} from '../utils.js';
import {
    Condition,
    Entry,
    KVStore,
    mapCondition,
    Transaction,
} from './kv-store.js';

export class PrefixedTransaction<TValue>
    implements Transaction<Uint8Array, TValue>
{
    private readonly prefix: Uint8Array;

    constructor(
        cx: Cx,
        private readonly target: Transaction<Uint8Array, TValue>,
        prefix: string | Uint8Array
    ) {
        if (typeof prefix === 'string') {
            this.prefix = encodeString(cx, prefix);
        } else {
            this.prefix = prefix;
        }
    }

    get(cx: Cx, key: Uint8Array): Promise<TValue | undefined> {
        return this.target.get(cx, concatBuffers(this.prefix, key));
    }

    async *query(
        cx: Cx,
        condition: Condition<Uint8Array>
    ): AsyncIterable<[Cx, Entry<Uint8Array, TValue>]> {
        const prefixedCondition = mapCondition<
            Uint8Array,
            Condition<Uint8Array>
        >(cx, condition, {
            gt: cond => ({gt: concatBuffers(this.prefix, cond.gt)}),
            gte: cond => ({gte: concatBuffers(this.prefix, cond.gte)}),
            lt: cond => ({lt: concatBuffers(this.prefix, cond.lt)}),
            lte: cond => ({lte: concatBuffers(this.prefix, cond.lte)}),
        });

        const stream = this.target.query(cx, prefixedCondition);
        for await (const [cx, {key, value}] of stream) {
            if (
                compareUint8Array(
                    key.slice(0, this.prefix.length),
                    this.prefix
                ) !== 0
            ) {
                return;
            }

            yield [cx, {key: key.slice(this.prefix.length), value}];
        }
    }

    put(cx: Cx, key: Uint8Array, value: TValue): Promise<void> {
        return this.target.put(cx, concatBuffers(this.prefix, key), value);
    }

    delete(cx: Cx, key: Uint8Array): Promise<void> {
        return this.target.delete(cx, concatBuffers(this.prefix, key));
    }
}

export class PrefixedKVStore<TValue> implements KVStore<Uint8Array, TValue> {
    private readonly prefix: Uint8Array;

    constructor(
        cx: Cx,
        private readonly target: KVStore<Uint8Array, TValue>,
        prefix: string | Uint8Array
    ) {
        if (typeof prefix === 'string') {
            this.prefix = encodeString(cx, prefix);
        } else {
            this.prefix = prefix;
        }
    }

    async transact<TResult>(
        cx: Cx,
        fn: (cx: Cx, tx: Transaction<Uint8Array, TValue>) => Promise<TResult>
    ): Promise<TResult> {
        return await this.target.transact(cx, (cx, tx) =>
            fn(cx, new PrefixedTransaction(cx, tx, this.prefix))
        );
    }
}
