import {MsgpackCodec} from '../codec.js';
import {type CrdtDiff} from '../crdt/crdt.js';
import {CollectionManager} from '../kv/collection-manager.js';
import {type AppTransaction, isolate, type KvStore} from '../kv/kv-store.js';
import {log} from '../logger.js';
import {getNow, type Timestamp} from '../timestamp.js';
import type {Tuple} from '../tuple.js';
import {assert, whenAll} from '../utils.js';
import type {Uuid} from '../uuid.js';
import {type AuthContext} from './auth-context.js';
import {AggregateDataNode, DataNode, RepoDataNode} from './data-node.js';
import {EventStoreReader, EventStoreWriter} from './event-store.js';
import {HubClient} from './hub.js';
import {PermissionService} from './permission-service.js';
import {
    type Attachment,
    type AttachmentId,
    AttachmentRepo,
} from './repos/attachment-repo.js';
import {type Board, type BoardId, BoardRepo} from './repos/board-repo.js';
import {type Card, type CardId, CardRepo} from './repos/card-repo.js';
import {type Column, type ColumnId, ColumnRepo} from './repos/column-repo.js';
import {
    type Identity,
    type IdentityId,
    IdentityRepo,
} from './repos/identity-repo.js';
import {type Member, type MemberId, MemberRepo} from './repos/member-repo.js';
import {
    type Message,
    type MessageId,
    MessageRepo,
} from './repos/message-repo.js';
import {type User, type UserId, UserRepo} from './repos/user-repo.js';

export interface Config {
    readonly jwtSecret: string;
}

export interface DataTx {
    readonly users: UserRepo;
    readonly members: MemberRepo;
    readonly boards: BoardRepo;
    readonly cards: CardRepo;
    readonly columns: ColumnRepo;
    readonly messages: MessageRepo;
    readonly attachments: AttachmentRepo;
    readonly identities: IdentityRepo;
    readonly config: Config;
    readonly tx: AppTransaction;
    readonly dataNode: DataNode;
    readonly events: CollectionManager<ChangeEvent>;
    readonly ps: PermissionService;
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

export interface CardChangeEvent
    extends BaseChangeEvent<'card', CardId, Card> {}

export interface IdentityChangeEvent
    extends BaseChangeEvent<'identity', IdentityId, Identity> {}

export interface ColumnChangeEvent
    extends BaseChangeEvent<'column', ColumnId, Column> {}

export interface MessageChangeEvent
    extends BaseChangeEvent<'message', MessageId, Message> {}

export interface AttachmentChangeEvent
    extends BaseChangeEvent<'attachment', AttachmentId, Attachment> {}

export type ChangeEvent =
    | UserChangeEvent
    | MemberChangeEvent
    | BoardChangeEvent
    | CardChangeEvent
    | IdentityChangeEvent
    | ColumnChangeEvent
    | MessageChangeEvent
    | AttachmentChangeEvent;

export type DataEffect = () => Promise<void>;
export type DataEffectScheduler = (effect: DataEffect) => void;

export type Transact = <T>(fn: (tx: DataTx) => Promise<T>) => Promise<T>;

const mainEventStoreId = 'main';

export class DataLayer {
    public readonly esReader: EventStoreReader<ChangeEvent>;

    constructor(
        private readonly kv: KvStore<Tuple, Uint8Array>,
        private readonly hub: HubClient<{}>,
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
                    data => fn(data.events)
                ),
            mainEventStoreId,
            hub
        );
    }

    close(reason: unknown) {
        this.kv.close(reason);
        this.hub.close(reason);
    }

    async transact<T>(
        auth: AuthContext,
        fn: (tx: DataTx) => Promise<T>
    ): Promise<T> {
        let effects: DataEffect[] = [];
        const result = await this.kv.transact(async tx => {
            // clear effect because of transaction retries
            effects = [];

            const users = new UserRepo(isolate(['users'])(tx), (id, diff) =>
                logUserChange(dataTx, id, diff)
            );
            const identities = new IdentityRepo(
                isolate(['identities'])(tx),
                users,
                (pk, diff) => logIdentityChange(dataTx, pk, diff)
            );
            const boards = new BoardRepo(
                isolate(['boards'])(tx),
                () => dataTx,
                (pk, diff) => logBoardChange(dataTx, pk, diff)
            );
            const members = new MemberRepo(
                isolate(['members'])(tx),
                users,
                boards,
                (pk, diff) => logMemberChange(dataTx, pk, diff)
            );
            const cards = new CardRepo(
                isolate(['cards'])(tx),
                boards,
                users,
                (pk, diff) => logCardChange(dataTx, pk, diff)
            );
            const columns = new ColumnRepo(
                isolate(['columns'])(tx),
                boards,
                users,
                (pk, diff) => logColumnChange(dataTx, pk, diff)
            );
            const messages = new MessageRepo(
                isolate(['messages'])(tx),
                cards,
                users,
                (pk, diff) => logMessageChange(dataTx, pk, diff)
            );
            const attachments = new AttachmentRepo(
                isolate(['attachments'])(tx),
                cards,
                users,
                boards,
                (pk, diff) => logAttachmentChange(dataTx, pk, diff)
            );

            const dataNode = new AggregateDataNode({
                identities: new RepoDataNode(identities.rawRepo),
                users: new RepoDataNode(users.rawRepo),
                boards: new RepoDataNode(boards.rawRepo),
                cards: new RepoDataNode(cards.rawRepo),
                columns: new RepoDataNode(columns.rawRepo),
                members: new RepoDataNode(members.rawRepo),
            });

            const events = new CollectionManager<ChangeEvent>(
                isolate(['events'])(tx),
                new MsgpackCodec()
            );

            const scheduleEffect = (effect: DataEffect) => effects.push(effect);

            const esWriter = new EventStoreWriter(
                events,
                mainEventStoreId,
                this.hub,
                scheduleEffect
            );

            const dataTx: DataTx = {
                boards,
                cards,
                columns,
                attachments,
                messages,
                events,
                identities,
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
            log.info(`running ${effects.length} effects...`);

            const effectsSnapshot = effects;
            effects = [];

            await whenAll(effectsSnapshot.map(effect => effect()));

            log.info('effects executed');

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
    const ts = getNow();
    const event: BoardChangeEvent = {type: 'board', id, diff, ts};
    await whenAll([
        tx.esWriter.append(boardEvents(id), event),
        tx.members
            .getByBoardId(id)
            .mapParallel(async member => {
                await tx.esWriter.append(userEvents(member.userId), event);
            })
            .consume(),
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

async function logCardChange(tx: DataTx, [id]: [CardId], diff: CrdtDiff<Card>) {
    const card = await tx.cards.getById(id, true);
    assert(card !== undefined, `logCardChange: card ${id} not found`);
    const ts = getNow();
    const event: CardChangeEvent = {type: 'card', id, diff, ts};
    await tx.esWriter.append(boardEvents(card.boardId), event);
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

async function logMessageChange(
    tx: DataTx,
    [id]: [MessageId],
    diff: CrdtDiff<Message>
) {
    const message = await tx.messages.getById(id, true);
    assert(message !== undefined, `logMessageChange: message ${id} not found`);
    const card = await tx.cards.getById(message.cardId, true);
    assert(
        card !== undefined,
        `logMessageChange: card ${message.cardId} not found`
    );
    const ts = getNow();
    const event: MessageChangeEvent = {type: 'message', id, diff, ts};
    await tx.esWriter.append(boardEvents(card.boardId), event);
}

async function logAttachmentChange(
    tx: DataTx,
    [id]: [AttachmentId],
    diff: CrdtDiff<Attachment>
) {
    const attachment = await tx.attachments.getById(id, true);
    assert(
        attachment !== undefined,
        `logAttachmentChange: attachment ${id} not found`
    );
    const card = await tx.cards.getById(attachment.cardId, true);
    assert(
        card !== undefined,
        `logAttachmentChange: card ${attachment.cardId} not found`
    );
    const ts = getNow();
    const event: AttachmentChangeEvent = {type: 'attachment', id, diff, ts};
    await tx.esWriter.append(boardEvents(card.boardId), event);
}
