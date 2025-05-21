import {Type, type Static} from '@sinclair/typebox';
import {EVENT_STORE_MAX_PULL_COUNT, PULL_INTERVAL_MS} from '../constants.js';
import {context} from '../context.js';
import {Cursor} from '../cursor.js';
import {CancelledError} from '../errors.js';
import {CollectionManager} from '../kv/collection-manager.js';
import {log} from '../logger.js';
import {Channel, Stream, toStream} from '../stream.js';
import {Timestamp} from '../timestamp.js';
import type {Hub} from '../transport/hub.js';
import type {ToSchema} from '../type.js';
import {interval} from '../utils.js';
import {TransactionId, type DataEffectScheduler} from './data-layer.js';

function getEventHubTopic(storeId: string, collection: string) {
    return `es/${storeId}/${collection}`;
}

export function LogEntry<T>(schema: ToSchema<T>) {
    return Type.Composite([
        Type.Object({
            event: schema,
            transactionId: TransactionId(),
            timestamp: Timestamp(),
        }),
    ]);
}

export interface LogEntry<T> extends Static<ReturnType<typeof LogEntry<T>>> {}

export interface EventStoreWriterOptions<T> {
    readonly logEntries: CollectionManager<LogEntry<T>>;
    readonly id: string;
    readonly hub: Hub;
    readonly transactionId: TransactionId;
    readonly timestamp: Timestamp;
    readonly scheduleEffect: DataEffectScheduler;
}

export class EventStoreWriter<T> implements EventStoreWriter<T> {
    private readonly events: CollectionManager<LogEntry<T>>;
    private readonly id: string;
    private readonly hub: Hub;
    private readonly transactionId: TransactionId;
    private readonly timestamp: Timestamp;
    private readonly scheduleEffect: DataEffectScheduler;

    constructor(options: EventStoreWriterOptions<T>) {
        this.events = options.logEntries;
        this.id = options.id;
        this.hub = options.hub;
        this.transactionId = options.transactionId;
        this.timestamp = options.timestamp;
        this.scheduleEffect = options.scheduleEffect;
    }

    async append(collection: string, event: T): Promise<void> {
        await this.events.get(collection).append({
            event,
            transactionId: this.transactionId,
            timestamp: this.timestamp,
        });
        const topic = getEventHubTopic(this.id, collection);
        this.scheduleEffect(() => this.hub.emit(topic));
    }
}

type EventStoreReaderTransact<T> = <TResult>(
    fn: (events: CollectionManager<T>) => Promise<TResult>
) => Promise<TResult>;

export class EventStoreReader<T> implements EventStoreReader<T> {
    constructor(
        private transact: EventStoreReaderTransact<LogEntry<T>>,
        private id: string,
        private readonly hub: Hub
    ) {}

    async subscribe(
        collection: string,
        offsetArg?: number
    ): Promise<{
        offset: number;
        entries: Cursor<{entry: LogEntry<T>; offset: number}>;
    }> {
        // we wanna trigger event store iteration immediately if we didn't reach the end of the topic
        const selfTrigger = new Channel<void>();
        context().onEnd(() => selfTrigger.end());

        const initialOffset =
            offsetArg === undefined
                ? await this.transact(async topics =>
                      topics.get(collection).length()
                  )
                : offsetArg;

        const hubEvent$ = await this.hub.subscribe(
            getEventHubTopic(this.id, collection)
        );

        let offset = initialOffset;
        const stream = Stream.merge<void>([
            // make the first check immediately
            toStream<void>([undefined]),
            toStream(selfTrigger),
            hubEvent$.map(() => undefined),
            interval({
                ms: PULL_INTERVAL_MS,
                onCancel: 'reject',
            }).map(() => undefined),
        ])
            .conflate()
            .while(() => context().isActive)
            .flatMap(async () => {
                try {
                    const entries = await this.transact(async topics => {
                        const result = await topics
                            .get(collection)
                            .list(offset)
                            .take(EVENT_STORE_MAX_PULL_COUNT)
                            .map(entry => ({
                                offset: entry.offset,
                                entry: entry.data,
                            }))
                            .toArray();

                        // check if there are potentially more values to pull from the topic
                        if (result.length === EVENT_STORE_MAX_PULL_COUNT) {
                            // we don't wanna block on this call to avoid a deadlock
                            selfTrigger.next().catch((error: unknown) => {
                                log.error({
                                    error,
                                    msg: 'failed to trigger event store iteration',
                                });
                            });
                        }

                        return result;
                    });

                    log.info({
                        msg: `EventStoreReader.subscribe transact finished: ${entries.length}`,
                    });

                    offset += entries.length;

                    return entries;
                } catch (error) {
                    if (error instanceof CancelledError) {
                        log.info({msg: 'EventStoreReader.subscribe cancelled'});
                    } else {
                        log.error({
                            error,
                            msg: 'EventStoreReader.subscribe',
                        });
                    }
                    return [];
                }
            })
            .toCursor();

        return {offset: initialOffset - 1, entries: stream};
    }
}
