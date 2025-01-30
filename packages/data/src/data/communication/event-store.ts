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
import {Context} from '../../context.js';
import {CollectionManager} from '../../kv/collection-manager.js';
import {ReadonlyCell} from '../../kv/readonly-cell.js';
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

    async append(ctx: Context, collection: string, event: T): Promise<void> {
        const [id] = await whenAll([
            this.id.get(ctx),
            this.events.get(collection).append(ctx, event),
        ]);
        const topic = getEventHubTopic(id, collection);
        this.scheduleEffect(ctx => this.hub.publish(ctx, topic, undefined));
    }
}

type EventStoreReaderTransact<T> = <TResult>(
    ctx: Context,
    fn: (
        ctx: Context,
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
        ctx: Context,
        collection: string,
        offsetArg?: number
    ): Promise<AsyncStream<T>> {
        // we wanna trigger event store iteration immediately if we didn't reach the end of the topic
        const selfTrigger = new StreamPuppet<void>(ctx);

        let offset =
            offsetArg === undefined
                ? await this.transact(ctx, async (ctx, topics) =>
                      topics.get(collection).length(ctx)
                  )
                : offsetArg;

        const id = await this.transact(ctx, (ctx, _, id) => id.get(ctx));
        const hubEvent$ = await this.hub.subscribe(
            ctx,
            getEventHubTopic(id, collection)
        );

        return mergeStreams<void>([
            // make the first check immediately
            astream([undefined]),
            astream(selfTrigger),
            hubEvent$.map(() => undefined),
            interval(EVENT_STORE_PULL_INTERVAL_MS, ctx).map(() => undefined),
        ]).flatMap(async ctx => {
            try {
                const events = await this.transact(ctx, async (ctx, topics) => {
                    const result = await topics
                        .get(collection)
                        .list(ctx, offset)
                        .take(EVENT_STORE_MAX_PULL_COUNT)
                        .map((ctx, entry) => entry.data)
                        .toArray(ctx);

                    // check if there are potentially more values to pull from the topic
                    if (result.length === EVENT_STORE_MAX_PULL_COUNT) {
                        // we don't wanna block on this call to avoid a deadlock
                        selfTrigger.next().catch(error => {
                            console.error(
                                '[ERR] failed to trigger event store iteration',
                                error
                            );
                        });
                    }
                    return result;
                });

                offset += events.length;

                return events;
            } catch (error) {
                console.error('[ERR] EventStoreReader.subscribe', error);
                return [];
            }
        });
    }
}
