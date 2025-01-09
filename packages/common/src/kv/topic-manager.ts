import {Encoder} from '../encoder';
import {Uint8Transaction} from './kv-store';
import {Registry} from './registry';
import {Topic} from './topic';

export class TopicManager<T> {
    private readonly topics: Registry<Topic<T>>;

    constructor(txn: Uint8Transaction, encoder: Encoder<T>) {
        this.topics = new Registry(txn, topicTxn => new Topic(topicTxn, encoder));
    }

    topic(name: string): Topic<T> {
        return this.topics.get(name);
    }
}
