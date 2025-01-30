import {MsgpackCodec} from '../codec.js';
import {Context} from '../context.js';
import {CrdtDiff} from '../crdt/crdt.js';
import {CollectionManager} from '../kv/collection-manager.js';
import {Uint8KVStore, Uint8Transaction, withPrefix} from '../kv/kv-store.js';
import {ReadonlyCell} from '../kv/readonly-cell.js';
import {whenAll} from '../utils.js';
import {createUuid, Uuid} from '../uuid.js';
import {
    EventStoreReader,
    EventStoreWriter,
} from './communication/event-store.js';
import {HubClient} from './communication/hub.js';
import {AggregateDataNode, DataNode, RepoDataNode} from './data-node.js';
import {BoardId, BoardRepo} from './repos/board-repo.js';
import {IdentityRepo} from './repos/identity-repo.js';
import {MemberRepo} from './repos/member-repo.js';
import {TaskId, TaskRepo} from './repos/task-repo.js';
import {User, UserId, UserRepo} from './repos/user-repo.js';

export interface Config {
    readonly jwtSecret: string;
}

export interface DataTx {
    readonly users: UserRepo;
    readonly members: MemberRepo;
    readonly boards: BoardRepo;
    readonly tasks: TaskRepo;
    readonly identities: IdentityRepo;
    readonly userChangelog: CollectionManager<UserChangeEntry>;
    readonly config: Config;
    readonly tx: Uint8Transaction;
    readonly dataNode: DataNode;
    readonly events: CollectionManager<{value: string}>;
    readonly eventStoreId: ReadonlyCell<Uuid>;
    readonly esWriter: EventStoreWriter<{value: string}>;
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

export type Transact = <T>(
    ctx: Context,
    fn: (ctx: Context, tx: DataTx) => Promise<T>
) => Promise<T>;

export class DataLayer {
    public readonly esReader: EventStoreReader<{value: string}>;

    constructor(
        private readonly kv: Uint8KVStore,
        private readonly hub: HubClient<unknown>,
        private readonly jwtSecret: string
    ) {
        this.esReader = new EventStoreReader(
            (ctx, fn) =>
                this.transact(ctx, (ctx, data) =>
                    fn(ctx, data.events, data.eventStoreId)
                ),
            hub
        );
    }

    async transact<T>(
        ctx: Context,
        fn: (ctx: Context, tx: DataTx) => Promise<T>
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

            const noop = () => Promise.resolve();
            const users = new UserRepo(
                withPrefix('users/')(tx),
                handleUserChange
            );
            const identities = new IdentityRepo(
                withPrefix('identities/')(tx),
                noop
            );
            const members = new MemberRepo(withPrefix('members/')(tx), noop);
            const boards = new BoardRepo(withPrefix('boards/')(tx), noop);
            const tasks = new TaskRepo(withPrefix('tasks/')(tx), noop);

            const dataNode = new AggregateDataNode({
                identities: new RepoDataNode(identities.rawRepo),
                users: new RepoDataNode(users.rawRepo),
                boards: new RepoDataNode(boards.rawRepo),
                tasks: new RepoDataNode(tasks.rawRepo),
                members: new RepoDataNode(members.rawRepo),
            });

            const events = new CollectionManager<{value: string}>(
                withPrefix('events/')(tx),
                new MsgpackCodec()
            );

            const eventStoreId = new ReadonlyCell(
                withPrefix('events-id/')(tx),
                createUuid()
            );

            const scheduleEffect = effect => effects.push(effect);

            const esWriter = new EventStoreWriter(
                events,
                eventStoreId,
                this.hub,
                scheduleEffect
            );

            const result = await fn(ctx, {
                boards,
                tasks,
                events,
                identities,
                eventStoreId,
                esWriter,
                users,
                members,
                userChangelog,
                config: {
                    jwtSecret: this.jwtSecret,
                },
                tx: tx,
                dataNode,
                scheduleEffect,
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

export function userEvents(userId: UserId) {
    return `users/${userId}`;
}

export function boardEvents(boardId: BoardId) {
    return `boards/${boardId}`;
}

export function taskEvents(taskId: TaskId) {
    return `tasks/${taskId}`;
}
