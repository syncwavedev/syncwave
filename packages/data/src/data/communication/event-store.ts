import {
    astream,
    AsyncStream,
    mergeStreams,
    StreamPuppet,
} from '../../async-stream.js';
import {
    EVENT_STORE_MAX_PULL_COUNT,
    EVENT_STORE_PULL_INTERVAL_MS,
} from '../../constants.js';
import {Cx} from '../../context.js';
import {CollectionManager} from '../../kv/collection-manager.js';
import {ReadonlyCell} from '../../kv/readonly-cell.js';
import {logger} from '../../logger.js';
import {interval, whenAll} from '../../utils.js';
import {Uuid} from '../../uuid.js';
import {DataEffectScheduler} from '../data-layer.js';
import {HubClient} from './hub.js';

function getEventHubTopic(storeId: Uuid, collection: string) {
    return `event-store/${storeId}/${collection}`;
}

export class EventStoreWriter<T> implements EventStoreWriter<T> {
    constructor(
        private readonly events: CollectionManager<T>,
        private readonly id: ReadonlyCell<Uuid>,
        private readonly hub: HubClient<unknown>,
        private readonly scheduleEffect: DataEffectScheduler
    ) {}

    async append(cx: Cx, collection: string, event: T): Promise<void> {
        const [id] = await whenAll(cx, [
            this.id.get(cx),
            this.events.get(collection).append(cx, event),
        ]);
        const topic = getEventHubTopic(id, collection);
        this.scheduleEffect(cx => this.hub.publish(cx, topic, undefined));
    }
}

type EventStoreReaderTransact<T> = <TResult>(
    cx: Cx,
    fn: (
        cx: Cx,
        events: CollectionManager<T>,
        id: ReadonlyCell<Uuid>
    ) => Promise<TResult>
) => Promise<TResult>;

export class EventStoreReader<T> implements EventStoreReader<T> {
    constructor(
        private transact: EventStoreReaderTransact<T>,
        private readonly hub: HubClient<unknown>
    ) {}

    async subscribe(
        cx: Cx,
        collection: string,
        offsetArg?: number
    ): Promise<AsyncStream<T>> {
        // we wanna trigger event store iteration immediately if we didn't reach the end of the topic
        const selfTrigger = new StreamPuppet<void>(cx);

        let offset =
            offsetArg === undefined
                ? await this.transact(cx, async (cx, topics) =>
                      topics.get(collection).length(cx)
                  )
                : offsetArg;

        const id = await this.transact(cx, (cx, _, id) => id.get(cx));
        const hubEvent$ = await this.hub.subscribe(
            cx,
            getEventHubTopic(id, collection)
        );

        return mergeStreams<void>([
            // make the first check immediately
            astream([undefined]),
            astream(selfTrigger),
            hubEvent$.map(() => undefined),
            interval(EVENT_STORE_PULL_INTERVAL_MS, cx).map(() => undefined),
        ]).flatMap(async cx => {
            try {
                const events = await this.transact(cx, async (cx, topics) => {
                    const result = await topics
                        .get(collection)
                        .list(cx, offset)
                        .take(EVENT_STORE_MAX_PULL_COUNT)
                        .map((cx, entry) => entry.data)
                        .toArray(cx);

                    // check if there are potentially more values to pull from the topic
                    if (result.length === EVENT_STORE_MAX_PULL_COUNT) {
                        // we don't wanna block on this call to avoid a deadlock
                        selfTrigger.next(cx).catch(error => {
                            logger.error(
                                cx,
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
                logger.error(cx, 'EventStoreReader.subscribe', error);
                return [];
            }
        });
    }
}
