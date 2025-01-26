import {astream, AsyncStream} from '../async-stream.js';
import {Codec, NumberCodec} from '../codec.js';
import {pipe, whenAll} from '../utils.js';
import {Counter} from './counter.js';
import {
    Transaction,
    Uint8Transaction,
    withKeyCodec,
    withPrefix,
    withValueCodec,
} from './kv-store.js';

export interface TopicEntry<T> {
    readonly offset: number;
    readonly data: T;
}

export class Topic<T> {
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

    async push(...data: T[]): Promise<void> {
        const offset =
            (await this.counter.increment(data.length)) - data.length;
        await whenAll(data.map((x, idx) => this.log.put(offset + idx, x)));
    }

    list(start: number, end?: number): AsyncStream<TopicEntry<T>> {
        return astream(this._list(start, end));
    }

    private async *_list(
        start: number,
        end?: number
    ): AsyncIterable<TopicEntry<T>> {
        for await (const {key, value} of this.log.query({gte: start})) {
            if (end !== undefined && key >= end) return;

            yield {offset: key, data: value};
        }
    }
}
