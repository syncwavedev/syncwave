import {Channel} from 'async-channel';
import {Deferred} from '../deferred.js';
import type {Condition, Snapshot, Transaction} from './kv-store.js';

export class SnapController<K, V> {
    private snap: Snapshot<K, V> | undefined = undefined;
    private doneSignal = new Deferred<void>();
    private snapQueue = new Channel<Snapshot<K, V>>();

    async use(snap: Snapshot<K, V>) {
        await this.snapQueue.push(snap);
    }

    async accept() {
        this.snap = await this.snapQueue.get();
    }

    async get(key: K) {
        return this.snap!.get(key);
    }

    query(condition: Condition<K>) {
        return this.snap!.query(condition);
    }

    done() {
        this.snapQueue.close();
        this.doneSignal.resolve();
    }

    result() {
        return this.doneSignal.promise;
    }
}

export class TxController<K, V> {
    private tx: Transaction<K, V> | undefined = undefined;
    private txQueue = new Channel<Transaction<K, V>>();
    private doneSignal = new Deferred<void>();

    async get(key: K) {
        return this.tx!.get(key);
    }

    query(condition: Condition<K>) {
        return this.tx!.query(condition);
    }

    done() {
        this.txQueue.close();
        this.doneSignal.resolve();
    }

    result() {
        return this.doneSignal.promise;
    }

    async use(tx: Transaction<K, V>) {
        await this.txQueue.push(tx);
    }

    async accept() {
        this.tx = await this.txQueue.get();
    }

    async put(key: K, value: V) {
        return this.tx!.put(key, value);
    }

    async delete(key: K) {
        return this.tx!.delete(key);
    }
}
