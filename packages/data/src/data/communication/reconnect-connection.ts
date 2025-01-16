import {RECONNECT_WAIT_MS} from '../../constants';
import {assertNever, Subject, Unsubscribe, wait} from '../../utils';
import {Connection, ConnectionEvent, ConnectionSubscribeCallback, TransportClient} from './transport';

export class ReconnectConnection<T> implements Connection<T> {
    // if we already initiated connection process, then we want subsequent sends to wait until the
    // initial connect is done
    private connection?: Promise<Connection<T>>;
    private closed = false;
    private subject = new Subject<ConnectionEvent<T>>();

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
        this.getConnection();

        return this.subject.subscribe(cb);
    }

    async close(): Promise<void> {
        this.closed = true;
        if (this.connection) {
            const connection = this.connection;
            this.connection = undefined;

            await connection.then(x => x.close());
        }
    }

    private async getConnection(): Promise<Connection<T> | 'closed_during_connect'> {
        this.assertOpen();

        if (this.connection === undefined) {
            this.connection = (async () => {
                while (true) {
                    try {
                        return await this.transport.connect();
                    } catch {
                        await wait(RECONNECT_WAIT_MS);
                    }
                }
            })().then(conn => {
                conn.subscribe(event => {
                    if (event.type === 'message') {
                        this.subject.next(event);
                    } else if (event.type === 'close') {
                        this.connection = undefined;
                        // reconnect
                        this.getConnection();
                    } else {
                        assertNever(event);
                    }
                });

                return conn;
            });
        }

        const connection = await this.connection;

        if (this.closed) {
            connection.close();
            // connection closed during transport.connect
            this.connection = undefined;
            return 'closed_during_connect';
        }

        return connection;
    }

    private assertOpen() {
        if (this.closed) {
            throw new Error('connection is closed');
        }
    }
}
