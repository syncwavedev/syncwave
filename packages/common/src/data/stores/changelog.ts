import {CrdtDiff} from '../../crdt/crdt';
import {MsgpackrEncoder} from '../../encoder';
import {Counter} from '../../kv/counter';
import {Transaction, Uint8Transaction, withKeyEncoder, withPrefix, withValueEncoder} from '../../kv/kv-store';
import {NumberEncoder} from '../../kv/number-encoder';
import {pipe} from '../../utils';
import {Uuid} from '../../uuid';
import {Doc} from '../doc-store';

export enum ChangelogEntryType {
    Task,
    Board,
    User,
}

export interface ChangelogEntry {
    readonly idx: number;
    readonly type: ChangelogEntryType;
    readonly docId: Uuid;
    readonly diff: CrdtDiff<any>;
}

export class Changelog<T extends Doc> {
    private readonly counter: Counter;
    private readonly log: Transaction<number, ChangelogEntry>;

    constructor(txn: Uint8Transaction) {
        this.counter = new Counter(pipe(txn, withPrefix('c/')), 0);
        this.log = pipe(
            txn,
            withPrefix('l/'),
            withKeyEncoder(new NumberEncoder()),
            withValueEncoder(new MsgpackrEncoder())
        );
    }

    async append(type: ChangelogEntryType, docId: T['id'], diff: CrdtDiff<T>): Promise<void> {
        const idx = await this.counter.increment();
        await this.log.put(idx, {idx, type, docId, diff});
    }

    async *list(start: number, end: number): AsyncIterable<ChangelogEntry> {
        for await (const {key, value} of this.log.query({gte: start})) {
            if (key >= end) return;

            yield value;
        }
    }
}
