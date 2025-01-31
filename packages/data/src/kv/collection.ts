import {astream, AsyncStream} from '../async-stream.js';
import {Codec, NumberCodec} from '../codec.js';
import {Cx} from '../context.js';
import {pipe, whenAll} from '../utils.js';
import {Counter} from './counter.js';
import {
    Transaction,
    Uint8Transaction,
    withKeyCodec,
    withPrefix,
    withValueCodec,
} from './kv-store.js';

export interface CollectionEntry<T> {
    readonly offset: number;
    readonly data: T;
}

export class Collection<T> {
    private readonly counter: Counter;
    private readonly log: Transaction<number, T>;

    constructor(cx: Cx, tx: Uint8Transaction, codec: Codec<T>) {
        this.counter = new Counter(pipe(tx, withPrefix(cx, 'i/')), 0);
        this.log = pipe(
            tx,
            withPrefix(cx, 'l/'),
            withKeyCodec(new NumberCodec()),
            withValueCodec(codec)
        );
    }

    async length(cx: Cx) {
        return await this.counter.get(cx);
    }

    async append(cx: Cx, ...data: T[]): Promise<void> {
        const offset =
            (await this.counter.increment(cx, data.length)) - data.length;
        await whenAll(
            cx,
            data.map((x, idx) => this.log.put(cx, offset + idx, x))
        );
    }

    list(cx: Cx, start: number, end?: number): AsyncStream<CollectionEntry<T>> {
        return astream(this._list(cx, start, end));
    }

    private async *_list(
        cx: Cx,
        start: number,
        end?: number
    ): AsyncIterable<[Cx, CollectionEntry<T>]> {
        const stream = this.log.query(cx, {gte: start});
        for await (const [cx, {key, value}] of stream) {
            if (end !== undefined && key >= end) return;

            yield [cx, {offset: key, data: value}];
        }
    }
}
