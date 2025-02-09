import {MsgpackCodec} from '../codec.js';
import {CrdtDiff} from '../crdt/crdt.js';
import {CollectionManager} from '../kv/collection-manager.js';
import {Uint8KVStore, Uint8Transaction, withPrefix} from '../kv/kv-store.js';
import {ReadonlyCell} from '../kv/readonly-cell.js';
import {log} from '../logger.js';
import {getNow, Timestamp} from '../timestamp.js';
import {assert, whenAll} from '../utils.js';
import {createUuid, Uuid} from '../uuid.js';
import {AuthContext} from './auth-context.js';
import {AggregateDataNode, DataNode, RepoDataNode} from './data-node.js';
import {EventStoreReader, EventStoreWriter} from './event-store.js';
import {HubClient} from './hub.js';
import {PermissionService} from './permission-service.js';
import {Board, BoardId, BoardRepo} from './repos/board-repo.js';
import {Column, ColumnId, ColumnRepo} from './repos/column-repo.js';
import {Comment, CommentId, CommentRepo} from './repos/comment-repo.js';
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
    readonly columns: ColumnRepo;
    readonly comments: CommentRepo;
    readonly identities: IdentityRepo;
    readonly config: Config;
    readonly tx: Uint8Transaction;
    readonly dataNode: DataNode;
    readonly events: CollectionManager<ChangeEvent>;
    readonly ps: PermissionService;
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

export interface ColumnChangeEvent
    extends BaseChangeEvent<'column', ColumnId, Column> {}

export interface CommentChangeEvent
    extends BaseChangeEvent<'comment', CommentId, Comment> {}

export type ChangeEvent =
    | UserChangeEvent
    | MemberChangeEvent
    | BoardChangeEvent
    | TaskChangeEvent
    | IdentityChangeEvent
    | ColumnChangeEvent
    | CommentChangeEvent;

export type DataEffect = () => Promise<void>;
export type DataEffectScheduler = (effect: DataEffect) => void;

export type Transact = <T>(fn: (tx: DataTx) => Promise<T>) => Promise<T>;

export class DataLayer {
    public readonly esReader: EventStoreReader<ChangeEvent>;

    constructor(
        private readonly kv: Uint8KVStore,
        private readonly hub: HubClient<void>,
        private readonly jwtSecret: string
    ) {
        this.esReader = new EventStoreReader(
            fn =>
                this.transact(
                    {
                        identityId: undefined,
                        superadmin: false,
                        userId: undefined,
                    },
                    data => fn(data.events, data.eventStoreId)
                ),
            hub
        );
    }

    async transact<T>(
        auth: AuthContext,
        fn: (tx: DataTx) => Promise<T>
    ): Promise<T> {
        let effects: DataEffect[] = [];
        const result = await this.kv.transact(async tx => {
            // clear effect because of transaction retries
            effects = [];

            const users = new UserRepo(withPrefix('users/')(tx), (id, diff) =>
                logUserChange(dataTx, id, diff)
            );
            const identities = new IdentityRepo(
                withPrefix('identities/')(tx),
                users,
                (pk, diff) => logIdentityChange(dataTx, pk, diff)
            );
            const boards = new BoardRepo(
                withPrefix('boards/')(tx),
                () => dataTx,
                (pk, diff) => logBoardChange(dataTx, pk, diff)
            );
            const members = new MemberRepo(
                withPrefix('members/')(tx),
                users,
                boards,
                (pk, diff) => logMemberChange(dataTx, pk, diff)
            );
            const tasks = new TaskRepo(
                withPrefix('tasks/')(tx),
                boards,
                users,
                (pk, diff) => logTaskChange(dataTx, pk, diff)
            );
            const columns = new ColumnRepo(
                withPrefix('columns/')(tx),
                boards,
                users,
                (pk, diff) => logColumnChange(dataTx, pk, diff)
            );
            const comments = new CommentRepo(
                withPrefix('comments/')(tx),
                tasks,
                users,
                (pk, diff) => logCommentChange(dataTx, pk, diff)
            );

            const dataNode = new AggregateDataNode({
                identities: new RepoDataNode(identities.rawRepo),
                users: new RepoDataNode(users.rawRepo),
                boards: new RepoDataNode(boards.rawRepo),
                tasks: new RepoDataNode(tasks.rawRepo),
                columns: new RepoDataNode(columns.rawRepo),
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

            const scheduleEffect = (effect: DataEffect) => effects.push(effect);

            const esWriter = new EventStoreWriter(
                events,
                eventStoreId,
                this.hub,
                scheduleEffect
            );

            const dataTx: DataTx = {
                boards,
                tasks,
                columns,
                comments,
                events,
                identities,
                eventStoreId,
                esWriter,
                users,
                members,
                ps: new PermissionService(auth, () => dataTx),
                config: {
                    jwtSecret: this.jwtSecret,
                },
                tx: tx,
                dataNode,
                scheduleEffect,
            };

            const result = await fn(dataTx);

            return result;
        });

        while (effects.length > 0) {
            const effectsSnapshot = effects;
            effects = [];

            await whenAll(effectsSnapshot.map(effect => effect()));

            if (effects.length > 0) {
                log.info('effect recursion detected');
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
    tx: DataTx,
    [id]: [IdentityId],
    diff: CrdtDiff<Identity>
) {
    const identity = await tx.identities.getById(id);
    assert(
        identity !== undefined,
        `logIdentityChange: identity ${id} not found`
    );
    const members = await tx.members
        .getByUserId(identity.userId, true)
        .toArray();
    const ts = getNow();
    const event: IdentityChangeEvent = {type: 'identity', id, diff, ts};
    await whenAll([
        tx.esWriter.append(userEvents(identity.userId), event),
        ...members.map(member =>
            tx.esWriter.append(boardEvents(member.boardId), event)
        ),
    ]);
}

async function logUserChange(tx: DataTx, [id]: [UserId], diff: CrdtDiff<User>) {
    const members = await tx.members.getByUserId(id, true).toArray();
    const ts = getNow();
    const event: UserChangeEvent = {type: 'user', id, diff, ts};
    await whenAll([
        tx.esWriter.append(userEvents(id), event),
        ...members.map(member =>
            tx.esWriter.append(boardEvents(member.boardId), event)
        ),
    ]);
}

async function logBoardChange(
    tx: DataTx,
    [id]: [BoardId],
    diff: CrdtDiff<Board>
) {
    const members = await tx.members.getByBoardId(id).toArray();
    const ts = getNow();
    const event: BoardChangeEvent = {type: 'board', id, diff, ts};
    await whenAll([
        tx.esWriter.append(boardEvents(id), event),
        ...members.map(member =>
            tx.esWriter.append(userEvents(member.userId), event)
        ),
    ]);
}

async function logMemberChange(
    tx: DataTx,
    [id]: [MemberId],
    diff: CrdtDiff<Member>
) {
    const member = await tx.members.getById(id, true);
    assert(member !== undefined, `logMemberChange: member ${id} not found`);
    const ts = getNow();
    const event: MemberChangeEvent = {type: 'member', id, diff, ts};
    await whenAll([
        tx.esWriter.append(boardEvents(member.boardId), event),
        tx.esWriter.append(userEvents(member.userId), event),
    ]);
}

async function logTaskChange(tx: DataTx, [id]: [TaskId], diff: CrdtDiff<Task>) {
    const task = await tx.tasks.getById(id, true);
    assert(task !== undefined, `logTaskChange: task ${id} not found`);
    const ts = getNow();
    const event: TaskChangeEvent = {type: 'task', id, diff, ts};
    await tx.esWriter.append(boardEvents(task.boardId), event);
}

async function logColumnChange(
    tx: DataTx,
    [id]: [ColumnId],
    diff: CrdtDiff<Column>
) {
    const column = await tx.columns.getById(id, true);
    assert(column !== undefined, `logColumnChange: column ${id} not found`);
    const ts = getNow();
    const event: ColumnChangeEvent = {type: 'column', id, diff, ts};
    await tx.esWriter.append(boardEvents(column.boardId), event);
}

async function logCommentChange(
    tx: DataTx,
    [id]: [CommentId],
    diff: CrdtDiff<Comment>
) {
    const comment = await tx.comments.getById(id, true);
    assert(comment !== undefined, `logCommentChange: comment ${id} not found`);
    const task = await tx.tasks.getById(comment.taskId, true);
    assert(
        task !== undefined,
        `logCommentChange: task ${comment.taskId} not found`
    );
    const ts = getNow();
    const event: CommentChangeEvent = {type: 'comment', id, diff, ts};
    await tx.esWriter.append(boardEvents(task.boardId), event);
}
