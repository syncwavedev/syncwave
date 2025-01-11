import {Codec} from '../codec';
import {Uint8Transaction} from './kv-store';
import {Registry} from './registry';
import {Topic} from './topic';

export class TopicManager<T> {
    private readonly topics: Registry<Topic<T>>;

    constructor(txn: Uint8Transaction, codec: Codec<T>) {
        this.topics = new Registry(txn, topicTxn => new Topic(topicTxn, codec));
    }

    topic(name: string): Topic<T> {
        return this.topics.get(name);
    }
}
