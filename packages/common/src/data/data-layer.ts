import {CrdtDiff} from '../crdt/crdt';
import {MsgpackrEncoder} from '../encoder';
import {Uint8KVStore, withPrefix} from '../kv/kv-store';
import {TopicManager} from '../kv/topic-manager';
import {User, UserId, UserRepo} from './repos/user-repo';

export interface TransactionContext {
    readonly users: UserRepo;
    readonly userChangelog: TopicManager<UserChangeEntry>;
}

export interface UserChangeEntry {
    readonly userId: UserId;
    readonly diff: CrdtDiff<User>;
}

export class DataLayer {
    constructor(private readonly kv: Uint8KVStore) {}

    async transaction<T>(fn: (txn: TransactionContext) => Promise<T>): Promise<T> {
        return await this.kv.transaction(async txn => {
            const userChangelog = new TopicManager<UserChangeEntry>(
                withPrefix('topics/users/')(txn),
                new MsgpackrEncoder()
            );

            async function handleUserChange(userId: UserId, diff: CrdtDiff<User>): Promise<void> {
                await userChangelog.topic(userId.toString()).push({userId, diff});
            }

            const users = new UserRepo(withPrefix('users/')(txn), handleUserChange);

            const result = await fn({users, userChangelog});

            return result;
        });
    }
}
