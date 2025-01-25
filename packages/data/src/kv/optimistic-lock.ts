import {StringCodec} from '../codec.js';
import {createUuid, UuidCodec} from '../uuid.js';
import {Uint8Transaction} from './kv-store.js';

export class OptimisticLock {
    private readonly uuidCodec = new UuidCodec();
    private readonly stringCodec = new StringCodec();

    constructor(private readonly tx: Uint8Transaction) {}

    async lock(key?: string | Uint8Array): Promise<void> {
        const keyBuf =
            key === undefined
                ? new Uint8Array()
                : typeof key === 'string'
                  ? this.stringCodec.encode(key)
                  : key;
        await this.tx.put(keyBuf, this.uuidCodec.encode(createUuid()));
    }
}
