import {Encoder} from '../encoder';
import {Dict} from './dict';
import {Uint8Transaction} from './kv-store';
import {Topic} from './topic';

export class TopicManager<T> {
    private readonly topics: Dict<Topic<T>>;

    constructor(txn: Uint8Transaction, encoder: Encoder<T>) {
        this.topics = new Dict(txn, topicTxn => new Topic(topicTxn, encoder));
    }

    topic(name: string): Topic<T> {
        return this.topics.get(name);
    }
}
