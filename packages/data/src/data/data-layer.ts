import {type Static, Type} from '@sinclair/typebox';
import {MsgpackCodec} from '../codec.js';
import {zCrdtDiff} from '../crdt/crdt.js';
import {CollectionManager} from '../kv/collection-manager.js';
import {type AppTransaction, isolate, type KvStore} from '../kv/kv-store.js';
import {log} from '../logger.js';
import {getNow, zTimestamp} from '../timestamp.js';
import type {Hub} from '../transport/hub.js';
import type {Tuple} from '../tuple.js';
import {assert, type Brand, whenAll} from '../utils.js';
import {Uuid} from '../uuid.js';
import {type AuthContext} from './auth-context.js';
import {AwarenessStore} from './awareness-store.js';
import {BoardService} from './board-service.js';
import type {ChangeOptions} from './doc-repo.js';
import {EventStoreReader, EventStoreWriter} from './event-store.js';
import type {CryptoService} from './infrastructure.js';
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
    readonly awareness: AwarenessStore;
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
    readonly events: CollectionManager<ChangeEvent>;
    readonly ps: PermissionService;
    readonly esWriter: EventStoreWriter<ChangeEvent>;
    readonly boardService: BoardService;
    // effects are not guaranteed to run because process might die after transaction is commited
    //
    // use topics with a pull loop where possible or hubs that combine strong
    // guarantees of topics with optimistic notifications for timely effect execution
    readonly scheduleEffect: DataEffectScheduler;
}

export function zBaseChangeEvent<
    TType extends string,
    TId extends Uuid,
    TValue,
>(type: TType) {
    return Type.Object({
        type: Type.Literal(type),
        kind: Type.Union([Type.Literal('create'), Type.Literal('update')]),
        id: Uuid<TId>(),
        diff: zCrdtDiff<TValue>(),
        ts: zTimestamp(),
    });
}

export interface BaseChangeEvent<TType extends string, TId extends Uuid, TValue>
    extends Static<ReturnType<typeof zBaseChangeEvent<TType, TId, TValue>>> {}

export function zUserChangeEvent() {
    return zBaseChangeEvent<'user', UserId, User>('user');
}

export interface UserChangeEvent
    extends Static<ReturnType<typeof zUserChangeEvent>> {}

export function zMemberChangeEvent() {
    return zBaseChangeEvent<'member', MemberId, Member>('member');
}

export interface MemberChangeEvent
    extends Static<ReturnType<typeof zMemberChangeEvent>> {}

export function zBoardChangeEvent() {
    return zBaseChangeEvent<'board', BoardId, Board>('board');
}

export interface BoardChangeEvent
    extends Static<ReturnType<typeof zBoardChangeEvent>> {}

export function zCardChangeEvent() {
    return zBaseChangeEvent<'card', CardId, Card>('card');
}

export interface CardChangeEvent
    extends Static<ReturnType<typeof zCardChangeEvent>> {}

export function zIdentityChangeEvent() {
    return zBaseChangeEvent<'identity', IdentityId, Identity>('identity');
}

export interface IdentityChangeEvent
    extends Static<ReturnType<typeof zIdentityChangeEvent>> {}

export function zColumnChangeEvent() {
    return zBaseChangeEvent<'column', ColumnId, Column>('column');
}

export interface ColumnChangeEvent
    extends Static<ReturnType<typeof zColumnChangeEvent>> {}

export function zMessageChangeEvent() {
    return zBaseChangeEvent<'message', MessageId, Message>('message');
}

export interface MessageChangeEvent
    extends Static<ReturnType<typeof zMessageChangeEvent>> {}

export function zAttachmentChangeEvent() {
    return zBaseChangeEvent<'attachment', AttachmentId, Attachment>(
        'attachment'
    );
}

export interface AttachmentChangeEvent
    extends Static<ReturnType<typeof zAttachmentChangeEvent>> {}

export function zChangeEvent() {
    return Type.Union([
        zUserChangeEvent(),
        zMemberChangeEvent(),
        zBoardChangeEvent(),
        zCardChangeEvent(),
        zIdentityChangeEvent(),
        zColumnChangeEvent(),
        zMessageChangeEvent(),
        zAttachmentChangeEvent(),
    ]);
}

export type ChangeEvent = Static<ReturnType<typeof zChangeEvent>>;

export type AsyncCallback = () => Promise<void>;
export type DataEffectScheduler = Brand<
    (effect: AsyncCallback) => void,
    'data_effect'
>;
export type DataTriggerScheduler = Brand<
    (callback: AsyncCallback) => void,
    'data_trigger'
>;

export type Transact = <T>(fn: (tx: DataTx) => Promise<T>) => Promise<T>;

const mainEventStoreId = 'main';

export class DataLayer {
    public readonly esReader: EventStoreReader<ChangeEvent>;

    constructor(
        private readonly kv: KvStore<Tuple, Uint8Array>,
        private readonly hub: Hub,
        private readonly jwtSecret: string,
        private readonly crypto: CryptoService
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
        let effects: AsyncCallback[] = [];
        const result = await this.kv.transact(async tx => {
            // clear effect because of transaction retries
            effects = [];
            let triggers: AsyncCallback[] = [];

            const scheduleTrigger = ((effect: AsyncCallback) =>
                triggers.push(effect)) as unknown as DataTriggerScheduler;

            const users = new UserRepo({
                tx: isolate(['users'])(tx),
                onChange: options => logUserChange(dataTx, options),
                scheduleTrigger,
            });
            const identities = new IdentityRepo({
                tx: isolate(['identities'])(tx),
                userRepo: users,
                onChange: options => logIdentityChange(dataTx, options),
                scheduleTrigger,
            });
            const boards = new BoardRepo({
                tx: isolate(['boards'])(tx),
                users,
                onChange: options => logBoardChange(dataTx, options),
                scheduleTrigger,
            });
            const members = new MemberRepo({
                tx: isolate(['members'])(tx),
                userRepo: users,
                boardRepo: boards,
                onChange: options => logMemberChange(dataTx, options),
                scheduleTrigger,
            });
            const cards = new CardRepo({
                tx: isolate(['cards'])(tx),
                boardRepo: boards,
                userRepo: users,
                onChange: options => logCardChange(dataTx, options),
                scheduleTrigger,
            });
            const columns = new ColumnRepo({
                tx: isolate(['columns'])(tx),
                boardRepo: boards,
                userRepo: users,
                onChange: options => logColumnChange(dataTx, options),
                scheduleTrigger,
            });
            const messages = new MessageRepo({
                tx: isolate(['messages'])(tx),
                cardRepo: cards,
                userRepo: users,
                onChange: options => logMessageChange(dataTx, options),
                scheduleTrigger,
            });
            const attachments = new AttachmentRepo({
                tx: isolate(['attachments'])(tx),
                cardRepo: cards,
                userRepo: users,
                boardRepo: boards,
                onChange: options => logAttachmentChange(dataTx, options),
                scheduleTrigger,
            });

            const events = new CollectionManager<ChangeEvent>(
                isolate(['events'])(tx),
                new MsgpackCodec()
            );

            const scheduleEffect = ((effect: AsyncCallback) =>
                effects.push(effect)) as unknown as DataEffectScheduler;

            const esWriter = new EventStoreWriter(
                events,
                mainEventStoreId,
                this.hub,
                scheduleEffect
            );

            const awareness = new AwarenessStore(isolate(['awareness'])(tx));

            const boardService = new BoardService({
                boards,
                crypto: this.crypto,
                identities,
                members,
                users,
            });

            const dataTx: DataTx = {
                boardService,
                awareness,
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
                scheduleEffect,
            };

            const result = await fn(dataTx);

            while (triggers.length > 0) {
                log.debug(`running ${triggers.length} triggers...`);

                const triggersSnapshot = triggers;
                triggers = [];

                await whenAll(triggersSnapshot.map(trigger => trigger()));

                log.debug('triggers executed');

                if (triggers.length > 0) {
                    log.info('trigger recursion detected');
                }
            }

            return result;
        });

        while (effects.length > 0) {
            log.debug(`running ${effects.length} effects...`);

            const effectsSnapshot = effects;
            effects = [];

            await whenAll(effectsSnapshot.map(effect => effect()));

            log.debug('effects executed');

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

export function profileEvents(userId: UserId) {
    return `profiles-${userId}`;
}

export function boardEvents(boardId: BoardId) {
    return `boards-${boardId}`;
}

async function logIdentityChange(
    tx: DataTx,
    {pk: [id], diff, kind}: ChangeOptions<Identity>
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
    const event: IdentityChangeEvent = {type: 'identity', id, diff, ts, kind};
    await whenAll([
        tx.esWriter.append(userEvents(identity.userId), event),
        ...members.map(member =>
            tx.esWriter.append(boardEvents(member.boardId), event)
        ),
    ]);
}

async function logUserChange(
    tx: DataTx,
    {pk: [id], diff, kind}: ChangeOptions<User>
) {
    const members = await tx.members.getByUserId(id, true).toArray();
    const ts = getNow();
    const event: UserChangeEvent = {type: 'user', id, diff, ts, kind};
    await whenAll([
        tx.esWriter.append(userEvents(id), event),
        tx.esWriter.append(profileEvents(id), event),
        ...members.map(member =>
            tx.esWriter.append(boardEvents(member.boardId), event)
        ),
    ]);
}

async function logBoardChange(
    tx: DataTx,
    {pk: [id], diff, kind}: ChangeOptions<Board>
) {
    const ts = getNow();
    const event: BoardChangeEvent = {type: 'board', id, diff, ts, kind};
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
    {pk: [id], diff, kind}: ChangeOptions<Member>
) {
    const member = await tx.members.getById(id, true);
    assert(member !== undefined, `logMemberChange: member ${id} not found`);
    const ts = getNow();
    const event: MemberChangeEvent = {type: 'member', id, diff, ts, kind};
    await whenAll([
        tx.esWriter.append(boardEvents(member.boardId), event),
        tx.esWriter.append(userEvents(member.userId), event),
    ]);
}

async function logCardChange(
    tx: DataTx,
    {pk: [id], diff, kind}: ChangeOptions<Card>
) {
    const card = await tx.cards.getById(id, true);
    assert(card !== undefined, `logCardChange: card ${id} not found`);
    const ts = getNow();
    const event: CardChangeEvent = {type: 'card', id, diff, ts, kind};
    await tx.esWriter.append(boardEvents(card.boardId), event);
}

async function logColumnChange(
    tx: DataTx,
    {pk: [id], diff, kind}: ChangeOptions<Column>
) {
    const column = await tx.columns.getById(id, true);
    assert(column !== undefined, `logColumnChange: column ${id} not found`);
    const ts = getNow();
    const event: ColumnChangeEvent = {type: 'column', id, diff, ts, kind};
    await tx.esWriter.append(boardEvents(column.boardId), event);
}

async function logMessageChange(
    tx: DataTx,
    {pk: [id], diff, kind}: ChangeOptions<Message>
) {
    const message = await tx.messages.getById(id, true);
    assert(message !== undefined, `logMessageChange: message ${id} not found`);
    const card = await tx.cards.getById(message.cardId, true);
    assert(
        card !== undefined,
        `logMessageChange: card ${message.cardId} not found`
    );
    const ts = getNow();
    const event: MessageChangeEvent = {type: 'message', id, diff, ts, kind};
    await tx.esWriter.append(boardEvents(card.boardId), event);
}

async function logAttachmentChange(
    tx: DataTx,
    {pk: [id], diff, kind}: ChangeOptions<Attachment>
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
    const event: AttachmentChangeEvent = {
        type: 'attachment',
        id,
        diff,
        ts,
        kind,
    };
    await tx.esWriter.append(boardEvents(card.boardId), event);
}
