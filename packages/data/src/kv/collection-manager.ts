import {type Codec} from '../codec.js';
import {Collection} from './collection.js';
import {type Uint8Transaction} from './kv-store.js';
import {Registry} from './registry.js';

export class CollectionManager<T> {
    private readonly collections: Registry<Collection<T>>;

    constructor(tx: Uint8Transaction, codec: Codec<T>) {
        this.collections = new Registry(
            tx,
            topicTx => new Collection(topicTx, codec)
        );
    }

    get(name: string): Collection<T> {
        return this.collections.get(name);
    }
}
