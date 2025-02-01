import {RECONNECT_WAIT_MS} from '../../constants.js';
import {logger} from '../../logger.js';
import {Observer, Subject, Unsubscribe, wait} from '../../utils.js';
import {Connection, TransportClient} from './transport.js';

export class PersistentConnection<T> implements Connection<T> {
    // if we already initiated connection process, then we want subsequent sends to wait until the
    // initial connect is done
    private connection?: Promise<Connection<T>>;
    private closed = false;
    private subject = new Subject<T>();

    constructor(private readonly transport: TransportClient<T>) {}

    async send(message: T): Promise<void> {
        const connection = await this.getConnection();
        if (connection === 'closed_during_connect') {
            return;
        }

        await connection.send(message);
    }

    subscribe(cb: Observer<T>): Unsubscribe {
        this.assertOpen();

        // connect if not already
        this.getConnection().catch(err => {
            logger.error('error while connection to the server: ', err);
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
        this.subject.close();
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
                            await this.subject.throw(
                                new Error('connection is lost, reconnection...')
                            );
                        } catch (error) {
                            logger.error('reconnect observers error', error);
                        }

                        // reconnect
                        this.getConnection().catch(err => {
                            logger.error(
                                'error while reconnection to the server: ',
                                err
                            );
                        });
                    }
                };

                const unsub = conn.subscribe({
                    next: message => this.subject.next(message),
                    throw: async error => {
                        unsub();
                        logger.error('error in underlying connection', error);
                        await reconnect();
                    },
                    close: () => {
                        unsub();
                        reconnect().catch(error => {
                            logger.error('close => reconnect', error);
                        });
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
