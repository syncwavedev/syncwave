import {
    astream,
    AsyncStream,
    HotStream,
    mergeStreams,
} from '../../async-stream.js';
import {Codec} from '../../codec.js';
import {BUS_MAX_PULL_COUNT, BUS_PULL_INTERVAL_MS} from '../../constants.js';
import {Counter} from '../../kv/counter.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Topic} from '../../kv/topic.js';
import {Cancellation, interval} from '../../utils.js';
import {DataEffectScheduler} from '../data-layer.js';
import {HubClient} from './hub.js';

export class BusProducer<T> implements BusProducer<T> {
    constructor(
        private readonly topic: Topic<T>,
        private readonly scheduleEffect: DataEffectScheduler,
        private readonly hub: HubClient<T>
    ) {}

    async publish(message: T, cx: Cancellation): Promise<void> {
        await this.topic.push(message);
        this.scheduleEffect(() => this.hub.publish(message, cx));
    }
}

export class BusConsumer<T> implements BusConsumer<T> {
    private readonly transact: <TResult>(
        fn: (topic: Topic<T>, counter: Counter) => Promise<TResult>
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
                const topic = new Topic(withPrefix('topic/')(tx), this.codec);
                const counter = new Counter(withPrefix('counter')(tx), 0);

                return fn(topic, counter);
            });
    }

    subscribe(cx: Cancellation): AsyncStream<T[]> {
        // we wanna trigger bus iteration immediately if we didn't reach the end of the topic
        const selfTrigger = new HotStream<void>();
        return mergeStreams<void>([
            // make the first check immediately
            astream([undefined]),
            selfTrigger,
            this.hub.subscribe(cx).map(() => undefined),
            interval(BUS_PULL_INTERVAL_MS, cx).map(() => undefined),
        ]).map(async () => {
            const messages = await this.transact(async (topic, counter) => {
                const result = await topic
                    .list(await counter.get())
                    .take(BUS_MAX_PULL_COUNT)
                    .map(x => x.data)
                    .toArray();
                await counter.increment(result.length);

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

            return messages;
        });
    }
}
