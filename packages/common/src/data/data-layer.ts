import {StringEncoder} from '../encoder';
import {Uint8KVStore, withKeySerializer, withPrefix, withValueSerializer} from '../kv/kv-store';
import {pipe} from '../utils';
import {UuidEncoder, createUuid} from '../uuid';
import {TaskRepository, getTaskStore} from './stores/task-store';
import {UserStore} from './stores/user-store';

export interface DataLayerTransaction {
    readonly users: UserStore;
    readonly tasks: TaskRepository;

    optimisticLock(key: string): Promise<void>;
}

export interface DataLayer {
    transaction<T>(fn: (txn: DataLayerTransaction) => Promise<T>): Promise<T>;
}

export function getDataLayer(kv: Uint8KVStore): DataLayer {
    return {
        transaction(fn) {
            return kv.transaction(txn =>
                fn({
                    users: new UserStore(withPrefix('users/')(txn), (id, diff) => Promise.resolve()),
                    tasks: getTaskStore(withPrefix('tasks/')(txn)),
                    optimisticLock: key =>
                        pipe(txn, withKeySerializer(new StringEncoder()), withValueSerializer(new UuidEncoder())).put(
                            key,
                            createUuid()
                        ),
                })
            );
        },
    };
}
