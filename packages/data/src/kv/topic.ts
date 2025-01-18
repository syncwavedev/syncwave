import {Codec, NumberCodec} from '../codec.js';
import {pipe, whenAll} from '../utils.js';
import {Counter} from './counter.js';
import {Transaction, Uint8Transaction, withKeyCodec, withPrefix, withValueCodec} from './kv-store.js';

export interface TopicEntry<T> {
    readonly offset: number;
    readonly data: T;
}

export class Topic<T> {
    private readonly counter: Counter;
    private readonly log: Transaction<number, T>;

    constructor(txn: Uint8Transaction, codec: Codec<T>) {
        this.counter = new Counter(pipe(txn, withPrefix('i/')), 0);
        this.log = pipe(txn, withPrefix('l/'), withKeyCodec(new NumberCodec()), withValueCodec(codec));
    }

    async push(...data: T[]): Promise<void> {
        const offset = (await this.counter.increment(data.length)) - data.length;
        await whenAll(data.map((x, idx) => this.log.put(offset + idx, x)));
    }

    async *list(start: number, end: number): AsyncIterable<TopicEntry<T>> {
        for await (const {key, value} of this.log.query({gte: start})) {
            if (key >= end) return;

            yield {offset: key, data: value};
        }
    }
}
