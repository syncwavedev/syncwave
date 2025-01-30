import {MsgpackCodec} from '../codec.js';
import {Context} from '../context.js';
import {CrdtDiff} from '../crdt/crdt.js';
import {CollectionManager} from '../kv/collection-manager.js';
import {Uint8KVStore, Uint8Transaction, withPrefix} from '../kv/kv-store.js';
import {ReadonlyCell} from '../kv/readonly-cell.js';
import {getNow, Timestamp} from '../timestamp.js';
import {assert, whenAll} from '../utils.js';
import {createUuid, Uuid} from '../uuid.js';
import {
    EventStoreReader,
    EventStoreWriter,
} from './communication/event-store.js';
import {HubClient} from './communication/hub.js';
import {AggregateDataNode, DataNode, RepoDataNode} from './data-node.js';
import {Board, BoardId, BoardRepo} from './repos/board-repo.js';
import {Identity, IdentityId, IdentityRepo} from './repos/identity-repo.js';
import {Member, MemberId, MemberRepo} from './repos/member-repo.js';
import {Task, TaskId, TaskRepo} from './repos/task-repo.js';
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
    readonly config: Config;
    readonly tx: Uint8Transaction;
    readonly dataNode: DataNode;
    readonly events: CollectionManager<ChangeEvent>;
    readonly eventStoreId: ReadonlyCell<Uuid>;
    readonly esWriter: EventStoreWriter<ChangeEvent>;
    // effects are not guaranteed to run because process might die after transaction is commited
    //
    // use topics with a pull loop where possible or hubs that combine strong
    // guarantees of topics with optimistic notifications for timely effect execution
    readonly scheduleEffect: DataEffectScheduler;
}

export interface BaseChangeEvent<
    TType extends string,
    TId extends Uuid,
    TValue,
> {
    readonly type: TType;
    readonly id: TId;
    readonly diff: CrdtDiff<TValue>;
    readonly ts: Timestamp;
}

export interface UserChangeEvent
    extends BaseChangeEvent<'user', UserId, User> {}

export interface MemberChangeEvent
    extends BaseChangeEvent<'member', MemberId, Member> {}

export interface BoardChangeEvent
    extends BaseChangeEvent<'board', BoardId, Board> {}

export interface TaskChangeEvent
    extends BaseChangeEvent<'task', TaskId, Task> {}

export interface IdentityChangeEvent
    extends BaseChangeEvent<'identity', IdentityId, Identity> {}

export type ChangeEvent =
    | UserChangeEvent
    | MemberChangeEvent
    | BoardChangeEvent
    | TaskChangeEvent
    | IdentityChangeEvent;

export type DataEffect = (ctx: Context) => Promise<void>;
export type DataEffectScheduler = (effect: DataEffect) => void;

export type Transact = <T>(
    ctx: Context,
    fn: (ctx: Context, tx: DataTx) => Promise<T>
) => Promise<T>;

export class DataLayer {
    public readonly esReader: EventStoreReader<ChangeEvent>;

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

            const users = new UserRepo(
                withPrefix('users/')(tx),
                (ctx, id, diff) => logUserChange(ctx, dataTx, id, diff)
            );
            const identities = new IdentityRepo(
                withPrefix('identities/')(tx),
                (ctx, id, diff) => logIdentityChange(ctx, dataTx, id, diff)
            );
            const members = new MemberRepo(
                withPrefix('members/')(tx),
                (ctx, id, diff) => logMemberChange(ctx, dataTx, id, diff)
            );
            const boards = new BoardRepo(
                withPrefix('boards/')(tx),
                (ctx, id, diff) => logBoardChange(ctx, dataTx, id, diff)
            );
            const tasks = new TaskRepo(
                withPrefix('tasks/')(tx),
                (ctx, id, diff) => logTaskChange(ctx, dataTx, id, diff)
            );

            const dataNode = new AggregateDataNode({
                identities: new RepoDataNode(identities.rawRepo),
                users: new RepoDataNode(users.rawRepo),
                boards: new RepoDataNode(boards.rawRepo),
                tasks: new RepoDataNode(tasks.rawRepo),
                members: new RepoDataNode(members.rawRepo),
            });

            const events = new CollectionManager<ChangeEvent>(
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

            const dataTx: DataTx = {
                boards,
                tasks,
                events,
                identities,
                eventStoreId,
                esWriter,
                users,
                members,
                config: {
                    jwtSecret: this.jwtSecret,
                },
                tx: tx,
                dataNode,
                scheduleEffect,
            };

            const result = await fn(ctx, dataTx);

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
    return `users-${userId}`;
}

export function boardEvents(boardId: BoardId) {
    return `boards-${boardId}`;
}

async function logIdentityChange(
    ctx: Context,
    tx: DataTx,
    id: IdentityId,
    diff: CrdtDiff<Identity>
) {
    const identity = await tx.identities.getById(ctx, id);
    assert(identity !== undefined);
    const members = await tx.members
        .getByUserId(ctx, identity.userId)
        .toArray(ctx);
    const ts = getNow();
    const event: IdentityChangeEvent = {type: 'identity', id, diff, ts};
    await whenAll([
        tx.esWriter.append(ctx, userEvents(identity.userId), event),
        ...members.map(member =>
            tx.esWriter.append(ctx, boardEvents(member.boardId), event)
        ),
    ]);
}

async function logUserChange(
    ctx: Context,
    tx: DataTx,
    id: UserId,
    diff: CrdtDiff<User>
) {
    const members = await tx.members.getByUserId(ctx, id).toArray(ctx);
    const ts = getNow();
    const event: UserChangeEvent = {type: 'user', id, diff, ts};
    await whenAll([
        tx.esWriter.append(ctx, userEvents(id), event),
        ...members.map(member =>
            tx.esWriter.append(ctx, boardEvents(member.boardId), event)
        ),
    ]);
}

async function logBoardChange(
    ctx: Context,
    tx: DataTx,
    id: BoardId,
    diff: CrdtDiff<Board>
) {
    const members = await tx.members.getByBoardId(ctx, id).toArray(ctx);
    const ts = getNow();
    const event: BoardChangeEvent = {type: 'board', id, diff, ts};
    await whenAll([
        tx.esWriter.append(ctx, boardEvents(id), event),
        ...members.map(member =>
            tx.esWriter.append(ctx, userEvents(member.userId), event)
        ),
    ]);
}

async function logMemberChange(
    ctx: Context,
    tx: DataTx,
    id: MemberId,
    diff: CrdtDiff<Member>
) {
    const member = await tx.members.getById(ctx, id);
    assert(member !== undefined);
    const ts = getNow();
    const event: MemberChangeEvent = {type: 'member', id, diff, ts};
    await whenAll([
        tx.esWriter.append(ctx, boardEvents(member.boardId), event),
        tx.esWriter.append(ctx, userEvents(member.userId), event),
    ]);
}

async function logTaskChange(
    ctx: Context,
    tx: DataTx,
    id: TaskId,
    diff: CrdtDiff<Task>
) {
    const task = await tx.tasks.getById(ctx, id);
    assert(task !== undefined);
    const ts = getNow();
    const event: TaskChangeEvent = {type: 'task', id, diff, ts};
    await tx.esWriter.append(ctx, boardEvents(task.boardId), event);
}
