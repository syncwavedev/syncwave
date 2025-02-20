import {context} from '../context.js';
import {log} from '../logger.js';
import {type Observer, Subject} from '../subject.js';
import type {Unsubscribe} from '../utils.js';
import type {Connection, TransportClient} from './transport.js';

export class ReleasableConnection<T> implements Connection<T> {
    private readonly subject = new Subject<T>();
    private readonly subscription: Unsubscribe;

    constructor(
        private readonly connection: Connection<T>,
        private readonly onRelease: () => void
    ) {
        this.subscription = this.connection.subscribe({
            next: value => this.subject.next(value),
            throw: error => this.subject.throw(error),
            close: (reason) => this.subject.close(reason),
        });
    }

    send(message: T): Promise<void> {
        return this.connection.send(message);
    }

    subscribe(observer: Observer<T>): Unsubscribe {
        return this.subject.subscribe(observer);
    }

    close(reason: unknown): void {
        this.subscription();
        this.subject.close(reason);
        this.onRelease();
    }
}

export class ConnectionPool<T> {
    private freeConnections: Connection<T>[] = [];
    private busyConnections: Connection<T>[] = [];

    constructor(private readonly client: TransportClient<T>) {}

    async connect(): Promise<ReleasableConnection<T>> {
        let connection = this.freeConnections.pop();
        if (!connection) {
            // we create background context to prevent connection from closing when parent context cancels
            const [ctx] = context().createDetached({span: 'connection pool'});
            connection = await ctx.run(async () => {
                const connection = await this.client.connect();
                connection.subscribe({
                    next: () => Promise.resolve(),
                    throw: () => Promise.resolve(),
                    close: () => {
                        this.busyConnections = this.busyConnections.filter(
                            x => x !== connection
                        );
                        this.freeConnections = this.freeConnections.filter(
                            x => x !== connection
                        );
                    },
                });

                return connection;
            });
        }

        this.busyConnections.push(connection);

        log.debug(
            `connection pool, free = ${this.freeConnections.length}, busy = ${this.busyConnections.length}`
        );

        return new ReleasableConnection(connection, () => {
            this.freeConnections.push(connection);
            this.busyConnections = this.busyConnections.filter(
                x => x !== connection
            );
        });
    }

    async close(reason: unknown): Promise<void> {
        this.freeConnections.forEach(conn => conn.close(reason));
        this.busyConnections.forEach(conn => conn.close(reason));
    }
}
