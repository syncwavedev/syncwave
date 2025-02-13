import {RECONNECT_WAIT_MS} from '../constants.js';
import {AppError, toError} from '../errors.js';
import {log} from '../logger.js';
import {Observer, Subject} from '../subject.js';
import {Unsubscribe, wait} from '../utils.js';
import {
    Connection,
    ConnectionClosedError,
    TransportClient,
    TransportServerUnreachableError,
} from './transport.js';

export class PersistentConnection<T> implements Connection<T> {
    // if we already initiated connection process, then we want subsequent sends to wait until the
    // initial connect is done
    private connection?: Promise<Connection<T>>;
    private closed = false;
    private subject = new Subject<T>();

    constructor(private readonly transport: TransportClient<T>) {}

    async send(message: T): Promise<void> {
        log.trace('persistent connection: send: ' + JSON.stringify(message));
        const connection = await this.getConnection();
        log.trace('persistent connection: got connection');
        if (connection === 'closed_during_connect') {
            return;
        }

        await connection.send(message);
    }

    subscribe(cb: Observer<T>): Unsubscribe {
        this.assertOpen();

        // connect if not already
        this.getConnection().catch(err => {
            log.error(err, 'error while connection to the server: ');
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
                    } catch (error) {
                        if (error instanceof TransportServerUnreachableError) {
                            log.warn(
                                `server is unreachable (${error.message}), retrying...`
                            );
                        } else {
                            log.error(
                                toError(error),
                                'persistent connection: error while connecting to the server: '
                            );
                        }
                        await wait({ms: RECONNECT_WAIT_MS, onCancel: 'reject'});
                    }
                }
            })().then(conn => {
                const reconnect = async () => {
                    if (!this.closed) {
                        this.connection = undefined;
                        try {
                            await this.subject.throw(
                                new AppError(
                                    'connection is lost, reconnection...'
                                )
                            );
                        } catch (error) {
                            log.error(
                                toError(error),
                                'reconnect observers error'
                            );
                        }

                        // reconnect
                        this.getConnection().catch(err => {
                            log.error(
                                err,
                                'error while reconnection to the server: '
                            );
                        });
                    }
                };

                const unsub = conn.subscribe({
                    next: message => this.subject.next(message),
                    throw: async error => {
                        unsub();
                        log.error(error, 'error in underlying connection');
                        await reconnect();
                    },
                    close: () => {
                        unsub();
                        reconnect().catch(error => {
                            log.error(error, 'close => reconnect');
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
            throw new ConnectionClosedError('persistent connection closed');
        }
    }
}
