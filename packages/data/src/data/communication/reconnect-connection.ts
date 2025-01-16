import {Deferred} from '../../deferred';
import {assertNever, Unsubscribe} from '../../utils';
import {Connection, ConnectionSubscribeCallback, TransportClient} from './transport';

export class ReconnectConnection<T> implements Connection<T> {
    private connection?: Connection<T>;
    private closed = false;

    constructor(private readonly transport: TransportClient<T>) {}

    async send(message: T): Promise<void> {
        const connection = await this.getConnection();
        if (connection === 'closed_during_connect') {
            return;
        }

        await connection.send(message);
    }

    subscribe(cb: ConnectionSubscribeCallback<T>): Unsubscribe {
        this.assertOpen();

        const unsubSignal = new Deferred<void>();

        (async () => {
            const connection = await this.getConnection();
            if (connection === 'closed_during_connect') {
                return;
            }

            const unsub = connection.subscribe(cb);

            unsubSignal.promise.then(unsub);
        })();

        return () => {
            unsubSignal.resolve();
        };
    }

    async close(): Promise<void> {
        this.closed = true;
        if (this.connection) {
            this.connection.close();
            this.connection = undefined;
        }
    }

    private async getConnection() {
        this.assertOpen();

        if (this.connection === undefined) {
            this.connection = await this.transport.connect();

            if (this.closed) {
                this.connection.close();
                // connection closed during transport.connect
                this.connection = undefined;
                return 'closed_during_connect';
            }

            this.connection.subscribe(event => {
                if (event.type === 'message') {
                    // do nothing
                } else if (event.type === 'close') {
                    this.connection = undefined;
                } else {
                    assertNever(event);
                }
            });
        }

        return this.connection;
    }

    private assertOpen() {
        if (this.closed) {
            throw new Error('connection is closed');
        }
    }
}
