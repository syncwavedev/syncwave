import {
    astream,
    AsyncStream,
    HotStream,
    mergeStreams,
} from '../../async-stream.js';
import {Codec} from '../../codec.js';
import {BUS_MAX_PULL_COUNT, BUS_PULL_INTERVAL_MS} from '../../constants.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {TopicManager} from '../../kv/topic-manager.js';
import {Cancellation, interval} from '../../utils.js';
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

    async publish(topic: string, message: T, cx: Cancellation): Promise<void> {
        await this.topics.get(topic).push(message);
        this.scheduleEffect(() => this.hub.publish(topic, undefined, cx));
    }
}

export class BusConsumer<T> implements BusConsumer<T> {
    private readonly transact: <TResult>(
        fn: (topics: TopicManager<T>) => Promise<TResult>
    ) => Promise<TResult>;

    constructor(
        transact: <TResult>(
            fn: (tx: Uint8Transaction) => Promise<TResult>
        ) => Promise<TResult>,
        private readonly hub: HubClient<void>,
        private readonly codec: Codec<T>
    ) {
        this.transact = async fn =>
            await transact(async tx => {
                const topics = new TopicManager(
                    withPrefix('topics/')(tx),
                    this.codec
                );

                return fn(topics);
            });
    }

    subscribe(
        topic: string,
        start: number,
        cx: Cancellation
    ): AsyncStream<T[]> {
        // we wanna trigger bus iteration immediately if we didn't reach the end of the topic
        const selfTrigger = new HotStream<void>();
        return mergeStreams<void>([
            // make the first check immediately
            astream([undefined]),
            selfTrigger,
            this.hub.subscribe(topic, cx).map(() => undefined),
            interval(BUS_PULL_INTERVAL_MS, cx).map(() => undefined),
        ]).map(async () => {
            const messages = await this.transact(async topics => {
                const result = await topics
                    .get(topic)
                    .list(start)
                    .take(BUS_MAX_PULL_COUNT)
                    .map(x => x.data)
                    .toArray();

                // check if there are potentially more values to pull from the topic
                if (result.length === BUS_MAX_PULL_COUNT) {
                    // we don't wanna block on this call to avoid a deadlock
                    selfTrigger.next().catch(error => {
                        console.error(
                            '[ERR] failed to trigger bus iteration',
                            error
                        );
                    });
                }
                return result;
            });

            start += messages.length;

            return messages;
        });
    }
}
