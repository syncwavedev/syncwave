import {context} from '../context.js';
import {Observer} from '../subject.js';
import {Nothing, Unsubscribe} from '../utils.js';
import {Connection, TransportClient, TransportServer} from './transport.js';

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
    close(): void {
        context().runChild({span: 'connection.close'}, () => {
            this.connection.close();
        });
    }
}

export class InstrumentedTransportClient<T> implements TransportClient<T> {
    constructor(private readonly client: TransportClient<T>) {}
    async connect(): Promise<Connection<T>> {
        return await context().runChild(
            {span: 'transport.connect'},
            async () => {
                return new InstrumentedConnection(await this.client.connect());
            }
        );
    }
}

export class InstrumentedTransportServer<T> implements TransportServer<T> {
    constructor(private readonly server: TransportServer<T>) {}
    async launch(cb: (connection: Connection<T>) => Nothing): Promise<void> {
        return await context().runChild(
            {span: 'transport.launch'},
            async () => {
                return await this.server.launch(connection => {
                    return context().runChild({span: 'connection'}, () => {
                        return cb(new InstrumentedConnection(connection));
                    });
                });
            }
        );
    }
    close(): void {
        context().runChild({span: 'transport.close'}, () => {
            this.server.close();
        });
    }
}
