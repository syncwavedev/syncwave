import {StringEncoder} from '../encoder';
import {createUuid, UuidEncoder} from '../uuid';
import {Uint8Transaction} from './kv-store';

export class OptimisticLock {
    private readonly uuidEncoder = new UuidEncoder();
    private readonly stringEncoder = new StringEncoder();

    constructor(private readonly txn: Uint8Transaction) {}

    async lock(key?: string | Uint8Array): Promise<void> {
        const keyBuf =
            key === undefined ? new Uint8Array() : typeof key === 'string' ? this.stringEncoder.encode(key) : key;
        await this.txn.put(keyBuf, this.uuidEncoder.encode(createUuid()));
    }
}
