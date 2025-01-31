import {Codec} from '../codec.js';
import {Cx} from '../context.js';
import {Collection} from './collection.js';
import {Uint8Transaction} from './kv-store.js';
import {Registry} from './registry.js';

export class CollectionManager<T> {
    private readonly collections: Registry<Collection<T>>;

    constructor(cx: Cx, tx: Uint8Transaction, codec: Codec<T>) {
        this.collections = new Registry(
            tx,
            topicTx => new Collection(cx, topicTx, codec)
        );
    }

    get(cx: Cx, name: string): Collection<T> {
        return this.collections.get(cx, name);
    }
}
