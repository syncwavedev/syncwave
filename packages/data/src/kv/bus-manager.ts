import {Codec} from '../codec.js';
import {BusConsumer, BusProducer} from '../data/communication/bus.js';
import {HubClient} from '../data/communication/hub.js';
import {Uint8Transaction} from './kv-store.js';
import {Registry} from './registry.js';

export class BusConsumerManager<T> {
    private readonly consumers: Registry<BusConsumer<T>>;

    constructor(tx: Uint8Transaction, hub: HubClient<void>, codec: Codec<T>) {
        this.consumers = new Registry(
            tx,
            busTx => new BusConsumer(fn => fn(busTx), hub, codec)
        );
    }

    get(topic: string): BusConsumer<T> {
        return this.consumers.get(topic);
    }
}

export class BusProducerManager<T> {
    private readonly consumers: Registry<BusProducer<T>>;

    constructor(tx: Uint8Transaction, hub: HubClient<void>, codec: Codec<T>) {
        this.consumers = new Registry(
            tx,
            busTx => new BusProducer(busTx, codec, hub)
        );
    }

    get(topic: string): BusProducer<T> {
        return this.consumers.get(topic);
    }
}
