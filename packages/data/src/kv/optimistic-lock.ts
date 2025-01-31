import {StringCodec} from '../codec.js';
import {Cx} from '../context.js';
import {createUuid, encodeUuid} from '../uuid.js';
import {Uint8Transaction} from './kv-store.js';

export class OptimisticLock {
    private readonly stringCodec = new StringCodec();

    constructor(private readonly tx: Uint8Transaction) {}

    async lock(cx: Cx, key?: string | Uint8Array): Promise<void> {
        const keyBuf =
            key === undefined
                ? new Uint8Array()
                : typeof key === 'string'
                  ? this.stringCodec.encode(cx, key)
                  : key;
        await this.tx.put(cx, keyBuf, encodeUuid(cx, createUuid()));
    }
}
