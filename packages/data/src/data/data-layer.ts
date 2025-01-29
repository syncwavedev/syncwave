import {MsgpackCodec} from '../codec.js';
import {Context} from '../context.js';
import {CrdtDiff} from '../crdt/crdt.js';
import {CollectionManager} from '../kv/collection-manager.js';
import {Uint8KVStore, Uint8Transaction, withPrefix} from '../kv/kv-store.js';
import {whenAll} from '../utils.js';
import {AggregateDataNode, DataNode, RepoDataNode} from './data-node.js';
import {BoardRepo} from './repos/board-repo.js';
import {IdentityRepo} from './repos/identity-repo.js';
import {MemberRepo} from './repos/member-repo.js';
import {TaskRepo} from './repos/task-repo.js';
import {User, UserId, UserRepo} from './repos/user-repo.js';

export interface Config {
    readonly jwtSecret: string;
}

export interface DataContext {
    readonly users: UserRepo;
    readonly identities: IdentityRepo;
    readonly userChangelog: CollectionManager<UserChangeEntry>;
    readonly config: Config;
    readonly tx: Uint8Transaction;
    readonly dataNode: DataNode;
    // effects are not guaranteed to run because process might die after transaction is commited
    //
    // use topics with a pull loop where possible or hubs that combine strong
    // guarantees of topics with optimistic notifications for timely effect execution
    readonly scheduleEffect: DataEffectScheduler;
}

export interface UserChangeEntry {
    readonly userId: UserId;
    readonly diff: CrdtDiff<User>;
}

export type DataEffect = (ctx: Context) => Promise<void>;
export type DataEffectScheduler = (effect: DataEffect) => void;

export class DataLayer {
    constructor(
        private readonly kv: Uint8KVStore,
        private readonly jwtSecret: string
    ) {}

    async transact<T>(
        ctx: Context,
        fn: (ctx: Context, tx: DataContext) => Promise<T>
    ): Promise<T> {
        let effects: DataEffect[] = [];
        const result = await this.kv.transact(ctx, async (ctx, tx) => {
            // clear effect because of transaction retries
            effects = [];

            const userChangelog = new CollectionManager<UserChangeEntry>(
                withPrefix('topics/users/')(tx),
                new MsgpackCodec()
            );

            async function handleUserChange(
                ctx: Context,
                userId: UserId,
                diff: CrdtDiff<User>
            ): Promise<void> {
                await userChangelog
                    .get(userId.toString())
                    .append(ctx, {userId, diff});
            }

            const users = new UserRepo(
                withPrefix('users/')(tx),
                handleUserChange
            );
            const identities = new IdentityRepo(
                withPrefix('identities/')(tx),
                () => Promise.resolve()
            );
            const members = new MemberRepo(withPrefix('members/')(tx), () =>
                Promise.resolve()
            );
            const boards = new BoardRepo(withPrefix('boards/')(tx), () =>
                Promise.resolve()
            );
            const tasks = new TaskRepo(withPrefix('tasks/')(tx), () =>
                Promise.resolve()
            );

            const dataNode = new AggregateDataNode({
                identities: new RepoDataNode(identities.rawRepo),
                users: new RepoDataNode(users.rawRepo),
                boards: new RepoDataNode(boards.rawRepo),
                tasks: new RepoDataNode(tasks.rawRepo),
                members: new RepoDataNode(members.rawRepo),
            });

            const result = await fn(ctx, {
                users,
                identities,
                userChangelog,
                config: {
                    jwtSecret: this.jwtSecret,
                },
                tx: tx,
                dataNode,
                scheduleEffect: effect => effects.push(effect),
            });

            return result;
        });

        while (effects.length > 0) {
            const effectsSnapshot = effects;
            effects = [];

            await whenAll(effectsSnapshot.map(effect => effect(ctx)));

            if (effects.length > 0) {
                console.info('[INF] effect recursion detected');
            }
        }

        return result;
    }
}
