import {RECONNECT_WAIT_MS} from '../../constants.js';
import {Cx} from '../../context.js';
import {AppError} from '../../errors.js';
import {logger} from '../../logger.js';
import {Observer, Subject, wait} from '../../utils.js';
import {Connection, TransportClient} from './transport.js';

export class PersistentConnection<T> implements Connection<T> {
    // if we already initiated connection process, then we want subsequent sends to wait until the
    // initial connect is done
    private connection?: Promise<Connection<T>>;
    private closed = false;
    private subject = new Subject<T>();
    private readonly connectionCx = Cx.background();

    constructor(private readonly transport: TransportClient<T>) {}

    async send(cx: Cx, message: T): Promise<void> {
        const connection = await this.getConnection();
        if (connection === 'closed_during_connect') {
            return;
        }

        await connection.send(cx, message);
    }

    subscribe(cx: Cx, cb: Observer<T>): void {
        this.assertOpen(cx);
        // connect if not already
        this.getConnection().catch(err => {
            logger.error(cx, 'error while connection to the server: ', err);
        });

        this.subject.subscribe(cx, cb);
    }

    async close(cx: Cx): Promise<void> {
        this.closed = true;
        if (this.connection) {
            const connection = this.connection;
            this.connection = undefined;

            await connection.then(x => x.close(cx));
        }
        await this.subject.close(cx);
    }

    // getConnection should not accept cx because it doesn't depend on it
    private async getConnection(): Promise<
        Connection<T> | 'closed_during_connect'
    > {
        const cx = Cx.background();
        this.assertOpen(cx);

        if (this.connection === undefined) {
            this.connection = (async () => {
                while (true) {
                    try {
                        return await this.transport.connect(cx);
                    } catch {
                        await wait(this.connectionCx, RECONNECT_WAIT_MS);
                    }
                }
            })().then(conn => {
                const reconnect = async (cx: Cx) => {
                    if (!this.closed) {
                        this.connection = undefined;
                        try {
                            await this.subject.throw(
                                new AppError(
                                    cx,
                                    'connection is lost, reconnection...'
                                )
                            );
                        } catch (error) {
                            logger.error(
                                cx,
                                'reconnect observers error',
                                error
                            );
                        }

                        // reconnect
                        this.getConnection().catch(err => {
                            logger.error(
                                cx,
                                'error while reconnection to the server: ',
                                err
                            );
                        });
                    }
                };

                conn.subscribe(this.connectionCx, {
                    next: async (cx, event) => {
                        await this.subject.next(cx, event);
                    },
                    throw: async error => {
                        logger.error(
                            Cx.todo(),
                            'error in underlying connection',
                            error
                        );
                        await reconnect(cx);
                    },
                    close: () => {
                        reconnect(cx).catch(error => {
                            logger.error(cx, 'close => reconnect', error);
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

    private assertOpen(cx: Cx) {
        if (this.closed) {
            throw new AppError(cx, 'connection is closed');
        }
    }
}
