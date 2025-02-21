import {StringCodec} from '../codec.js';
import type {Tuple} from '../tuple.js';
import {createUuid, encodeUuid} from '../uuid.js';
import type {AppTransaction} from './kv-store.js';

export class OptimisticLock {
    private readonly stringCodec = new StringCodec();

    constructor(private readonly tx: AppTransaction) {}

    async lock(key?: Tuple): Promise<void> {
        await this.tx.put(key ?? [], encodeUuid(createUuid()));
    }
}
