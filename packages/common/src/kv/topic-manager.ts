import {Encoder} from '../encoder';
import {Uint8Transaction, withPrefix} from './kv-store';
import {Topic} from './topic';

export class TopicManager<T> {
    constructor(
        private readonly txn: Uint8Transaction,
        private readonly encoder: Encoder<T>
    ) {}

    topic(name: string): Topic<T> {
        if (name.indexOf('/') !== -1) {
            throw new Error('invalid topic name, / is not allowed');
        }
        return new Topic(withPrefix(`t/${name}/`)(this.txn), this.encoder);
    }
}
