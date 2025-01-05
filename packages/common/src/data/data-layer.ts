import {Uint8KVStore, withKeySerializer, withPrefix, withValueSerializer} from '../kv/kv-store';
import {StringSerializer} from '../string-serializer';
import {pipe} from '../utils';
import {UuidSerializer, createUuid} from '../uuid';
import {TaskRepository, getTaskStore} from './stores/task-store';
import {UserRepository, getUserStore} from './stores/user-store';

export interface DataLayerTransaction {
    readonly users: UserRepository;
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
                    users: getUserStore(withPrefix('users/')(txn)),
                    tasks: getTaskStore(withPrefix('tasks/')(txn)),
                    optimisticLock: key =>
                        pipe(
                            txn,
                            withKeySerializer(new StringSerializer()),
                            withValueSerializer(new UuidSerializer())
                        ).put(key, createUuid()),
                })
            );
        },
    };
}
