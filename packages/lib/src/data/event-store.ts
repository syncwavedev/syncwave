import {EVENT_STORE_MAX_PULL_COUNT, PULL_INTERVAL_MS} from '../constants.js';
import {context} from '../context.js';
import {Cursor} from '../cursor.js';
import {CancelledError} from '../errors.js';
import {CollectionManager} from '../kv/collection-manager.js';
import {log} from '../logger.js';
import {Channel, Stream, toStream} from '../stream.js';
import type {Hub} from '../transport/hub.js';
import {interval} from '../utils.js';
import {type DataEffectScheduler} from './data-layer.js';

function getEventHubTopic(storeId: string, collection: string) {
    return `es/${storeId}/${collection}`;
}

export class EventStoreWriter<T> implements EventStoreWriter<T> {
    constructor(
        private readonly events: CollectionManager<T>,
        private readonly id: string,
        private readonly hub: Hub,
        private readonly scheduleEffect: DataEffectScheduler
    ) {}

    async append(collection: string, event: T): Promise<void> {
        await this.events.get(collection).append(event);
        const topic = getEventHubTopic(this.id, collection);
        this.scheduleEffect(() => this.hub.emit(topic));
    }
}

type EventStoreReaderTransact<T> = <TResult>(
    fn: (events: CollectionManager<T>) => Promise<TResult>
) => Promise<TResult>;

export class EventStoreReader<T> implements EventStoreReader<T> {
    constructor(
        private transact: EventStoreReaderTransact<T>,
        private id: string,
        private readonly hub: Hub
    ) {}

    async subscribe(
        collection: string,
        offsetArg?: number
    ): Promise<{offset: number; events: Cursor<{event: T; offset: number}>}> {
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
                    const events = await this.transact(async topics => {
                        const result = await topics
                            .get(collection)
                            .list(offset)
                            .take(EVENT_STORE_MAX_PULL_COUNT)
                            .map(entry => ({
                                offset: entry.offset,
                                event: entry.data,
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
                        msg: `EventStoreReader.subscribe transact finished: ${events.length}`,
                    });

                    offset += events.length;

                    return events;
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

        return {offset: initialOffset, events: stream};
    }
}
