import {
    astream,
    AsyncStream,
    HotStream,
    mergeStreams,
} from '../../async-stream.js';
import {Codec} from '../../codec.js';
import {BUS_MAX_PULL_COUNT, BUS_PULL_INTERVAL_MS} from '../../constants.js';
import {Context} from '../../context.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {TopicManager} from '../../kv/topic-manager.js';
import {interval} from '../../utils.js';
import {DataEffectScheduler} from '../data-layer.js';
import {HubClient} from './hub.js';

export class BusProducer<T> implements BusProducer<T> {
    private readonly topics: TopicManager<T>;
    constructor(
        tx: Uint8Transaction,
        codec: Codec<T>,
        private readonly hub: HubClient<void>,
        private readonly scheduleEffect: DataEffectScheduler
    ) {
        this.topics = new TopicManager(withPrefix('topics/')(tx), codec);
    }

    async publish(ctx: Context, topic: string, message: T): Promise<void> {
        await this.topics.get(topic).push(ctx, message);
        this.scheduleEffect(ctx, () => this.hub.publish(ctx, topic, undefined));
    }
}

export class BusConsumer<T> implements BusConsumer<T> {
    private readonly transact: <TResult>(
        fn: (ctx: Context, topics: TopicManager<T>) => Promise<TResult>
    ) => Promise<TResult>;

    constructor(
        transact: <TResult>(
            fn: (ctx: Context, tx: Uint8Transaction) => Promise<TResult>
        ) => Promise<TResult>,
        private readonly hub: HubClient<void>,
        private readonly codec: Codec<T>
    ) {
        this.transact = async fn =>
            await transact(async (ctx, tx) => {
                const topics = new TopicManager(
                    withPrefix('topics/')(tx),
                    this.codec
                );

                return fn(ctx, topics);
            });
    }

    subscribe(ctx: Context, topic: string, start: number): AsyncStream<T> {
        // we wanna trigger bus iteration immediately if we didn't reach the end of the topic
        const selfTrigger = new HotStream<void>();
        return mergeStreams<void>([
            // make the first check immediately
            astream([undefined]),
            selfTrigger,
            this.hub.subscribe(ctx, topic).map(() => undefined),
            interval(BUS_PULL_INTERVAL_MS, ctx).map(() => undefined),
        ]).flatMap(async () => {
            const messages = await this.transact(async (ctx, topics) => {
                const result = await topics
                    .get(topic)
                    .list(ctx, start)
                    .take(BUS_MAX_PULL_COUNT)
                    .map(x => x.data)
                    .toArray();

                // check if there are potentially more values to pull from the topic
                if (result.length === BUS_MAX_PULL_COUNT) {
                    // we don't wanna block on this call to avoid a deadlock
                    selfTrigger.next(Context.todo()).catch(error => {
                        console.error(
                            '[ERR] failed to trigger bus iteration',
                            error
                        );
                    });
                }
                return result;
            });

            console.log(`got ${messages.length} messages`);

            start += messages.length;

            return messages;
        });
    }
}
