import {type Codec} from '../codec.js';
import {Collection} from './collection.js';
import {type AppTransaction} from './kv-store.js';
import {Registry} from './registry.js';

export class CollectionManager<T> {
    private readonly collections: Registry<Collection<T>>;

    constructor(tx: AppTransaction, codec: Codec<T>) {
        this.collections = new Registry(
            tx,
            topicTx => new Collection(topicTx, codec)
        );
    }

    get(name: string): Collection<T> {
        return this.collections.get(name);
    }
}
