import {Rand} from '../rand.js';
import type {Observer} from '../subject.js';
import {type Unsubscribe, wait} from '../utils.js';
import type {Connection, TransportClient} from './transport.js';

export class ChaosConnection<T> implements Connection<T> {
    constructor(
        private readonly conn: Connection<T>,
        private readonly rand: Rand
    ) {}

    async send(message: T): Promise<void> {
        await wait({ms: this.rand.int32(0, 5), onCancel: 'reject'});
        await this.conn.send(message);
    }

    subscribe(observer: Observer<T>): Unsubscribe {
        return this.conn.subscribe(observer);
    }

    close(reason: unknown): void {
        this.conn.close(reason);
    }
}

export class ChaosTransportClient<T> implements TransportClient<T> {
    constructor(
        private readonly client: TransportClient<T>,
        private readonly rand: Rand
    ) {}

    async connect(): Promise<Connection<T>> {
        return new ChaosConnection(await this.client.connect(), this.rand);
    }
}
