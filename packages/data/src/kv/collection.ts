import {astream, AsyncStream} from '../async-stream.js';
import {Codec, NumberCodec} from '../codec.js';
import {Context} from '../context.js';
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

    constructor(tx: Uint8Transaction, codec: Codec<T>) {
        this.counter = new Counter(pipe(tx, withPrefix('i/')), 0);
        this.log = pipe(
            tx,
            withPrefix('l/'),
            withKeyCodec(new NumberCodec()),
            withValueCodec(codec)
        );
    }

    async append(ctx: Context, ...data: T[]): Promise<void> {
        const offset =
            (await this.counter.increment(ctx, data.length)) - data.length;
        await whenAll(data.map((x, idx) => this.log.put(ctx, offset + idx, x)));
    }

    list(
        ctx: Context,
        start: number,
        end?: number
    ): AsyncStream<CollectionEntry<T>> {
        return astream(this._list(ctx, start, end));
    }

    private async *_list(
        ctx: Context,
        start: number,
        end?: number
    ): AsyncIterable<CollectionEntry<T>> {
        for await (const {key, value} of this.log.query(ctx, {gte: start})) {
            if (end !== undefined && key >= end) return;

            yield {offset: key, data: value};
        }
    }
}
