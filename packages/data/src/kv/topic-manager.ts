import {Codec} from '../codec.js';
import {Uint8Transaction} from './kv-store.js';
import {Registry} from './registry.js';
import {Topic} from './topic.js';

export class TopicManager<T> {
    private readonly topics: Registry<Topic<T>>;

    constructor(tx: Uint8Transaction, codec: Codec<T>) {
        this.topics = new Registry(tx, topicTx => new Topic(topicTx, codec));
    }

    get(name: string): Topic<T> {
        return this.topics.get(name);
    }
}
