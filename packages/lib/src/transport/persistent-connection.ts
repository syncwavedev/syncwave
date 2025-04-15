import {context} from '../context.js';
import {getReadableError} from '../errors.js';
import {EventEmitter} from '../event-emitter.js';
import {log} from '../logger.js';
import {Mutex} from '../mutex.js';
import {type Observer, Subject} from '../subject.js';
import {type Unsubscribe} from '../utils.js';
import {
    type Connection,
    ConnectionClosedError,
    type TransportClient,
} from './transport.js';

export class PersistentConnection<T> implements Connection<T> {
    // if we already initiated connection process, then we want subsequent sends to wait until the
    // initial connect is done
    private connection?: Connection<T>;
    private connectMutex = new Mutex();
    private closed = false;
    private subject = new Subject<T>();

    readonly events = new EventEmitter<'online' | 'offline'>();

    constructor(private readonly transport: TransportClient<T>) {}

    async send(message: T): Promise<void> {
        const connection = await this.getConnection();
        if (connection === 'closed_during_connect') {
            return;
        }

        try {
            await connection.send(message);
        } catch (error) {
            this.connection = undefined;
            throw error;
        }
    }

    subscribe(cb: Observer<T>): Unsubscribe {
        this.assertOpen();

        // connect if not already
        this.getConnection().catch(error => {
            log.error({
                error,
                msg: 'error while connection to the server: ',
            });
        });

        return this.subject.subscribe(cb);
    }

    disconnect(reason: unknown): void {
        if (this.connection) {
            this.connection.close(reason);
            this.connection = undefined;
        }
    }

    close(reason: unknown): void {
        if (this.closed) return;
        this.closed = true;

        this.disconnect(reason);

        this.subject.close(reason);
        this.events.close();
    }

    private async getConnection(): Promise<
        Connection<T> | 'closed_during_connect'
    > {
        const [ctx, endCtx] = context().createDetached({
            span: 'setup persistent connection',
        });

        return await ctx.run(async () => {
            this.assertOpen();

            const connection = await this.connectMutex.run(async () => {
                if (this.connection) {
                    return this.connection;
                }

                const connection = await this.transport.connect();

                this.events.emit('online');

                this.connection = connection;

                const cleanup = (reason: unknown) => {
                    this.events.emit('offline');
                    this.connection = undefined;
                    connection.close(reason);
                    unsub(reason);
                    endCtx(reason);
                };

                const unsub = this.connection.subscribe({
                    next: message => this.subject.next(message),
                    throw: async error => {
                        log.error({
                            error,
                            msg: 'error in underlying connection',
                        });
                        cleanup(error);
                        await this.subject.throw(error);
                    },
                    close: reason => {
                        cleanup(reason);
                        this.subject
                            .throw(
                                new ConnectionClosedError(
                                    getReadableError(reason)
                                )
                            )
                            .catch(error => {
                                log.error({
                                    error,
                                    msg: 'PersistentConnection: failed to throw error',
                                });
                            });
                    },
                });

                return this.connection;
            });

            if (this.closed) {
                // connection closed during transport.connect
                return 'closed_during_connect';
            }

            return connection;
        });
    }

    private assertOpen() {
        if (this.closed) {
            throw new ConnectionClosedError('persistent connection closed');
        }
    }
}
