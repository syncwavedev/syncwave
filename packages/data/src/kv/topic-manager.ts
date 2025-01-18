import {Codec} from '../codec.js';
import {Uint8Transaction} from './kv-store.js';
import {Registry} from './registry.js';
import {Topic} from './topic.js';

export class TopicManager<T> {
    private readonly topics: Registry<Topic<T>>;

    constructor(txn: Uint8Transaction, codec: Codec<T>) {
        this.topics = new Registry(txn, topicTxn => new Topic(topicTxn, codec));
    }

    topic(name: string): Topic<T> {
        return this.topics.get(name);
    }
}
