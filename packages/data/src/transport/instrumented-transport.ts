import {context} from '../context.js';
import {getReadableError} from '../errors.js';
import type {Observer} from '../subject.js';
import type {Nothing, Unsubscribe} from '../utils.js';
import type {
    Connection,
    TransportClient,
    TransportServer,
} from './transport.js';

export class InstrumentedConnection<T> implements Connection<T> {
    constructor(private readonly connection: Connection<T>) {}
    async send(message: T): Promise<void> {
        return await context().runChild({span: 'connection.send'}, async () => {
            return await this.connection.send(message);
        });
    }
    subscribe(observer: Observer<T>): Unsubscribe {
        return this.connection.subscribe(observer);
    }
    close(reason: unknown): void {
        context().addEvent(
            'info',
            'transport.close: ' + getReadableError(reason)
        );
        this.connection.close(reason);
    }
}

export class InstrumentedTransportClient<T> implements TransportClient<T> {
    constructor(private readonly client: TransportClient<T>) {}
    async connect(): Promise<Connection<T>> {
        return new InstrumentedConnection(await this.client.connect());
    }
}

export class InstrumentedTransportServer<T> implements TransportServer<T> {
    constructor(private readonly server: TransportServer<T>) {}
    async launch(cb: (connection: Connection<T>) => Nothing): Promise<void> {
        return await this.server.launch(connection => {
            return cb(new InstrumentedConnection(connection));
        });
    }
    close(reason: unknown): void {
        context().addEvent(
            'info',
            'transport.close: ' + getReadableError(reason)
        );
        this.server.close(reason);
    }
}
