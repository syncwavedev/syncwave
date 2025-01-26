import {AsyncStream} from './async-stream.js';
import {DataEffectScheduler} from './data/data-layer.js';
import {Topic} from './kv/topic.js';
import {Observer, Subject, whenAll} from './utils.js';

export interface BusProducer<T> {
    publish(message: T): Promise<void>;
}

export interface BusConsumer<T> {
    subscribe(): AsyncStream<T>;
}

export class ReliableBusProducer<T> implements BusProducer<T> {
    constructor(
        private readonly topic: Topic<T>,
        private readonly unreliableBusProducer: BusProducer<T>
    ) {}

    async publish(message: T): Promise<void> {
        await whenAll([
            this.topic.push(message),
            this.unreliableBusProducer.publish(message),
        ]);
    }
}

export class UnreliableBusProducer<T> implements BusProducer<T> {
    constructor(
        private readonly scheduleEffect: DataEffectScheduler,
        private readonly subject: Subject<T, Observer<T>>
    ) {}

    async publish(message: T): Promise<void> {
        this.scheduleEffect(async () => {
            await this.subject.next(message);
        });
    }
}
