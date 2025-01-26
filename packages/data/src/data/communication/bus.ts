import {AsyncStream, mergeStreams} from '../../async-stream.js';
import {Codec} from '../../codec.js';
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
        private readonly scheduleEffect: DataEffectScheduler,
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
        return mergeStreams<void>([
            this.hub.subscribe(cx).map(() => undefined),
            interval(1000, cx).map(() => undefined),
        ]).map(async () => {
            const messages = await this.transact(async (topic, counter) => {
                const result = await topic.list(await counter.get()).toArray();
                await counter.increment(result.length);
                return result.map(x => x.data);
            });

            return messages;
        });
    }
}
