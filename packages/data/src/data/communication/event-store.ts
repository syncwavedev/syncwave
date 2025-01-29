import {
    astream,
    AsyncStream,
    HotStream,
    mergeStreams,
} from '../../async-stream.js';
import {Codec} from '../../codec.js';
import {
    EVENT_STORE_MAX_PULL_COUNT,
    EVENT_STORE_PULL_INTERVAL_MS,
} from '../../constants.js';
import {Context} from '../../context.js';
import {CollectionManager} from '../../kv/collection-manager.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {ReadonlyCell} from '../../kv/readonly-cell.js';
import {interval, whenAll} from '../../utils.js';
import {createUuid, Uuid} from '../../uuid.js';
import {DataEffectScheduler} from '../data-layer.js';
import {HubClient} from './hub.js';

function getEventHubTopic(storeId: Uuid, collection: string) {
    return `event-store/${storeId}/${collection}`;
}

export class EventStoreWriter<T> implements EventStoreWriter<T> {
    private readonly events: CollectionManager<T>;
    private readonly id: ReadonlyCell<Uuid>;

    constructor(
        tx: Uint8Transaction,
        codec: Codec<T>,
        private readonly hub: HubClient<unknown>,
        private readonly scheduleEffect: DataEffectScheduler
    ) {
        this.id = new ReadonlyCell(withPrefix('id/')(tx), createUuid());
        this.events = new CollectionManager(withPrefix('events/')(tx), codec);
    }

    async append(ctx: Context, collection: string, event: T): Promise<void> {
        const [id] = await whenAll([
            this.id.get(ctx),
            this.events.get(collection).append(ctx, event),
        ]);
        const topic = getEventHubTopic(id, collection);
        this.scheduleEffect(ctx => this.hub.publish(ctx, topic, undefined));
    }
}

export class EventStoreReader<T> implements EventStoreReader<T> {
    private readonly transact: <TResult>(
        ctx: Context,
        fn: (
            ctx: Context,
            events: CollectionManager<T>,
            id: ReadonlyCell<Uuid>
        ) => Promise<TResult>
    ) => Promise<TResult>;

    constructor(
        transact: <TResult>(
            ctx: Context,
            fn: (ctx: Context, tx: Uint8Transaction) => Promise<TResult>
        ) => Promise<TResult>,
        private readonly hub: HubClient<unknown>,
        private readonly codec: Codec<T>
    ) {
        this.transact = async (ctx, fn) =>
            await transact(ctx, async (ctx, tx) => {
                const events = new CollectionManager(
                    withPrefix('events/')(tx),
                    this.codec
                );
                const id = new ReadonlyCell(
                    withPrefix('id/')(tx),
                    createUuid()
                );

                return fn(ctx, events, id);
            });
    }

    subscribe(ctx: Context, collection: string, start: number): AsyncStream<T> {
        const idPromise = this.transact(ctx, (ctx, _, id) => id.get(ctx));
        // we wanna trigger event store iteration immediately if we didn't reach the end of the topic
        const selfTrigger = new HotStream<void>(ctx);
        return mergeStreams<void>([
            // make the first check immediately
            astream([undefined]),
            astream(selfTrigger),
            astream(idPromise).flatMap((ctx, id) =>
                this.hub
                    .subscribe(ctx, getEventHubTopic(id, collection))
                    .map(() => undefined)
            ),
            interval(EVENT_STORE_PULL_INTERVAL_MS, ctx).map(() => undefined),
        ]).flatMap(async ctx => {
            try {
                const events = await this.transact(ctx, async (ctx, topics) => {
                    const result = await topics
                        .get(collection)
                        .list(ctx, start)
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

                start += events.length;

                return events;
            } catch (error) {
                console.error('[ERR] EventStoreReader.subscribe', error);
                return [];
            }
        });
    }
}
