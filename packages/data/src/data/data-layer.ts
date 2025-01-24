import {MsgpackrCodec} from '../codec.js';
import {CrdtDiff} from '../crdt/crdt.js';
import {Uint8KVStore, Uint8Transaction, withPrefix} from '../kv/kv-store.js';
import {TopicManager} from '../kv/topic-manager.js';
import {AggregateDataNode, DataNode, RepoDataNode} from './data-node.js';
import {IdentityRepo} from './repos/identity-repo.js';
import {User, UserId, UserRepo} from './repos/user-repo.js';

export interface Config {
    readonly jwtSecret: string;
}

export interface TransactionContext {
    readonly users: UserRepo;
    readonly identities: IdentityRepo;
    readonly userChangelog: TopicManager<UserChangeEntry>;
    readonly config: Config;
    readonly tx: Uint8Transaction;
    readonly dataNode: DataNode;
}

export interface UserChangeEntry {
    readonly userId: UserId;
    readonly diff: CrdtDiff<User>;
}

export class DataLayer {
    constructor(
        private readonly kv: Uint8KVStore,
        private readonly jwtSecret: string
    ) {}

    async transaction<T>(
        fn: (txn: TransactionContext) => Promise<T>
    ): Promise<T> {
        return await this.kv.transaction(async tx => {
            const userChangelog = new TopicManager<UserChangeEntry>(
                withPrefix('topics/users/')(tx),
                new MsgpackrCodec()
            );

            async function handleUserChange(
                userId: UserId,
                diff: CrdtDiff<User>
            ): Promise<void> {
                await userChangelog
                    .topic(userId.toString())
                    .push({userId, diff});
            }

            const users = new UserRepo(
                withPrefix('users/')(tx),
                handleUserChange
            );
            const identities = new IdentityRepo(
                withPrefix('identities/')(tx),
                () => Promise.resolve()
            );

            const dataNode = new AggregateDataNode({
                identities: new RepoDataNode(identities.rawRepo),
                users: new RepoDataNode(users.rawRepo),
            });

            const result = await fn({
                users,
                identities,
                userChangelog,
                config: {
                    jwtSecret: this.jwtSecret,
                },
                tx: tx,
                dataNode,
            });

            return result;
        });
    }
}
