import {
    EVENT_STORE_MAX_PULL_COUNT,
    EVENT_STORE_PULL_INTERVAL_MS,
} from '../constants.js';
import {Cursor} from '../cursor.js';
import {CollectionManager} from '../kv/collection-manager.js';
import {ReadonlyCell} from '../kv/readonly-cell.js';
import {logger} from '../logger.js';
import {Channel, Stream, toStream} from '../stream.js';
import {interval, whenAll} from '../utils.js';
import {Uuid} from '../uuid.js';
import {DataEffectScheduler} from './data-layer.js';
import {HubClient} from './hub.js';

function getEventHubTopic(storeId: Uuid, collection: string) {
    return `event-store/${storeId}/${collection}`;
}

export class EventStoreWriter<T> implements EventStoreWriter<T> {
    constructor(
        private readonly events: CollectionManager<T>,
        private readonly id: ReadonlyCell<Uuid>,
        private readonly hub: HubClient<void>,
        private readonly scheduleEffect: DataEffectScheduler
    ) {}

    async append(collection: string, event: T): Promise<void> {
        const [id] = await whenAll([
            this.id.get(),
            this.events.get(collection).append(event),
        ]);
        const topic = getEventHubTopic(id, collection);
        this.scheduleEffect(() => this.hub.publish(topic, undefined));
    }
}

type EventStoreReaderTransact<T> = <TResult>(
    fn: (
        events: CollectionManager<T>,
        id: ReadonlyCell<Uuid>
    ) => Promise<TResult>
) => Promise<TResult>;

export class EventStoreReader<T> implements EventStoreReader<T> {
    constructor(
        private transact: EventStoreReaderTransact<T>,
        private readonly hub: HubClient<void>
    ) {}

    async subscribe(
        collection: string,
        offsetArg?: number
    ): Promise<Cursor<T>> {
        // we wanna trigger event store iteration immediately if we didn't reach the end of the topic
        const selfTrigger = new Channel<void>();

        let offset =
            offsetArg === undefined
                ? await this.transact(async topics =>
                      topics.get(collection).length()
                  )
                : offsetArg;

        const id = await this.transact((_, id) => id.get());
        const hubEvent$ = await this.hub.subscribe(
            getEventHubTopic(id, collection)
        );

        return Stream.merge<void>([
            // make the first check immediately
            toStream<void>([undefined]),
            toStream(selfTrigger),
            hubEvent$.map(() => undefined),
            interval({
                ms: EVENT_STORE_PULL_INTERVAL_MS,
                onCancel: 'reject',
            }).map(() => undefined),
        ])
            .flatMap(async () => {
                try {
                    const events = await this.transact(async topics => {
                        const result = await topics
                            .get(collection)
                            .list(offset)
                            .take(EVENT_STORE_MAX_PULL_COUNT)
                            .map(entry => entry.data)
                            .toArray();

                        // check if there are potentially more values to pull from the topic
                        if (result.length === EVENT_STORE_MAX_PULL_COUNT) {
                            // we don't wanna block on this call to avoid a deadlock
                            selfTrigger.next().catch((error: unknown) => {
                                logger.error(
                                    'failed to trigger event store iteration',
                                    error
                                );
                            });
                        }
                        return result;
                    });

                    offset += events.length;

                    return events;
                } catch (error) {
                    logger.error('EventStoreReader.subscribe', error);
                    return [];
                }
            })
            .toCursor();
    }
}
