import {StringCodec} from '../codec';
import {createUuid, UuidCodec} from '../uuid';
import {Uint8Transaction} from './kv-store';

export class OptimisticLock {
    private readonly uuidCodec = new UuidCodec();
    private readonly stringCodec = new StringCodec();

    constructor(private readonly txn: Uint8Transaction) {}

    async lock(key?: string | Uint8Array): Promise<void> {
        const keyBuf =
            key === undefined ? new Uint8Array() : typeof key === 'string' ? this.stringCodec.encode(key) : key;
        await this.txn.put(keyBuf, this.uuidCodec.encode(createUuid()));
    }
}
