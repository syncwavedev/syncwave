import {RECONNECT_WAIT_MS} from '../../constants.js';
import {Subject, Unsubscribe, wait, whenAll} from '../../utils.js';
import {Connection, ConnectionObserver, TransportClient} from './transport.js';

export class ReconnectConnection<T> implements Connection<T> {
    // if we already initiated connection process, then we want subsequent sends to wait until the
    // initial connect is done
    private connection?: Promise<Connection<T>>;
    private closed = false;
    private subject = new Subject<T, ConnectionObserver<T>>();

    constructor(private readonly transport: TransportClient<T>) {}

    async send(message: T): Promise<void> {
        const connection = await this.getConnection();
        if (connection === 'closed_during_connect') {
            return;
        }

        await connection.send(message);
    }

    subscribe(cb: ConnectionObserver<T>): Unsubscribe {
        this.assertOpen();
        // connect if not already
        this.getConnection().catch(err => {
            console.error('error while connection to the server: ', err);
        });

        return this.subject.subscribe(cb);
    }

    async close(): Promise<void> {
        this.closed = true;
        if (this.connection) {
            const connection = this.connection;
            this.connection = undefined;

            await connection.then(x => x.close());
        }
        await this.subject.close();
    }

    private async getConnection(): Promise<
        Connection<T> | 'closed_during_connect'
    > {
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
                const reconnect = async () => {
                    if (!this.closed) {
                        this.connection = undefined;
                        try {
                            await whenAll(
                                this.subject.observers
                                    .map(x => x.reconnect)
                                    .filter(reconnect => !!reconnect)
                                    .map(reconnect => reconnect())
                            );
                        } catch (error) {
                            console.error(
                                '[ERR] reconnect observers error',
                                error
                            );
                        }

                        // reconnect
                        this.getConnection().catch(err => {
                            console.error(
                                'error while reconnection to the server: ',
                                err
                            );
                        });
                    }
                };

                conn.subscribe({
                    next: async event => {
                        await this.subject.next(event);
                    },
                    throw: async error => {
                        console.error(
                            '[ERR] error in underlying connection',
                            error
                        );
                        await reconnect();
                    },
                    close: async () => {
                        await reconnect();
                    },
                });

                return conn;
            });
        }

        const connection = await this.connection;

        if (this.closed) {
            // connection closed during transport.connect
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
