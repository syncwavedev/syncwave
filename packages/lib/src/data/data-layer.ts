import {type Static, Type} from '@sinclair/typebox';
import {MsgpackCodec} from '../codec.js';
import {CrdtDiff} from '../crdt/crdt.js';
import {Cell} from '../kv/cell.js';
import {CollectionManager} from '../kv/collection-manager.js';
import {type AppTransaction, isolate, type KvStore} from '../kv/kv-store.js';
import {log} from '../logger.js';
import {getNow, Timestamp} from '../timestamp.js';
import type {Hub} from '../transport/hub.js';
import type {Tuple} from '../tuple.js';
import {assert, type Brand, whenAll} from '../utils.js';
import {createUuidV4, Uuid} from '../uuid.js';
import {type Principal, system} from './auth.js';
import {AwarenessStore} from './awareness-store.js';
import {BoardService} from './board-service.js';
import type {ChangeOptions} from './doc-repo.js';
import {MemberInfoDto} from './dto.js';
import {EmailService} from './email-service.js';
import {EventStoreReader, EventStoreWriter} from './event-store.js';
import type {CryptoProvider, EmailProvider} from './infrastructure.js';
import {createJoinCode} from './join-code.js';
import {MemberService} from './member-service.js';
import {PermissionService} from './permission-service.js';
import {
    type Account,
    type AccountId,
    AccountRepo,
} from './repos/account-repo.js';
import {
    type Attachment,
    type AttachmentId,
    AttachmentRepo,
} from './repos/attachment-repo.js';
import {type Board, type BoardId, BoardRepo} from './repos/board-repo.js';
import {type Card, type CardId, CardRepo} from './repos/card-repo.js';
import {type Column, type ColumnId, ColumnRepo} from './repos/column-repo.js';
import {type Member, type MemberId, MemberRepo} from './repos/member-repo.js';
import {
    type Message,
    type MessageId,
    MessageRepo,
} from './repos/message-repo.js';
import {User, type UserId, UserRepo} from './repos/user-repo.js';

export interface Config {
    readonly uiUrl: string;
}

export interface DataTx {
    readonly transactionId: TransactionId;
    readonly timestamp: Timestamp;
    readonly version: Cell<number>;
    readonly emailService: EmailService;
    readonly awareness: AwarenessStore;
    readonly memberService: MemberService;
    readonly users: UserRepo;
    readonly members: MemberRepo;
    readonly boards: BoardRepo;
    readonly cards: CardRepo;
    readonly columns: ColumnRepo;
    readonly messages: MessageRepo;
    readonly attachments: AttachmentRepo;
    readonly accounts: AccountRepo;
    readonly config: Config;
    readonly rawTx: AppTransaction;
    readonly events: CollectionManager<ChangeEvent>;
    readonly permissionService: PermissionService;
    readonly esWriter: EventStoreWriter<ChangeEvent>;
    readonly boardService: BoardService;
    // effects are not guaranteed to run because process might die after transaction is commited
    //
    // use topics with a pull loop where possible or hubs that combine strong
    // guarantees of topics with optimistic notifications for timely effect execution
    readonly scheduleEffect: DataEffectScheduler;
}

export function BaseChangeEvent<TType extends string, TId extends Uuid, TValue>(
    type: TType
) {
    return Type.Object({
        type: Type.Literal(type),
        kind: Type.Union([Type.Literal('create'), Type.Literal('update')]),
        id: Uuid<TId>(),
        diff: CrdtDiff<TValue>(),
        ts: Timestamp(),
    });
}

export interface BaseChangeEvent<TType extends string, TId extends Uuid, TValue>
    extends Static<ReturnType<typeof BaseChangeEvent<TType, TId, TValue>>> {}

export function UserChangeEvent() {
    return BaseChangeEvent<'user', UserId, User>('user');
}

export interface UserChangeEvent
    extends Static<ReturnType<typeof UserChangeEvent>> {}

export function MemberChangeEvent() {
    return BaseChangeEvent<'member', MemberId, Member>('member');
}

export interface MemberChangeEvent
    extends Static<ReturnType<typeof MemberChangeEvent>> {}

export function BoardChangeEvent() {
    return BaseChangeEvent<'board', BoardId, Board>('board');
}

export interface BoardChangeEvent
    extends Static<ReturnType<typeof BoardChangeEvent>> {}

export function CardChangeEvent() {
    return BaseChangeEvent<'card', CardId, Card>('card');
}

export interface CardChangeEvent
    extends Static<ReturnType<typeof CardChangeEvent>> {}

export function AccountChangeEvent() {
    return BaseChangeEvent<'account', AccountId, Account>('account');
}

export interface AccountChangeEvent
    extends Static<ReturnType<typeof AccountChangeEvent>> {}

export function ColumnChangeEvent() {
    return BaseChangeEvent<'column', ColumnId, Column>('column');
}

export interface ColumnChangeEvent
    extends Static<ReturnType<typeof ColumnChangeEvent>> {}

export function MessageChangeEvent() {
    return BaseChangeEvent<'message', MessageId, Message>('message');
}

export interface MessageChangeEvent
    extends Static<ReturnType<typeof MessageChangeEvent>> {}

export function MemberInfoChangeEvent() {
    return Type.Object({
        type: Type.Literal('member_info'),
        kind: Type.Literal('snapshot'),
        info: MemberInfoDto(),
        ts: Timestamp(),
    });
}

export function createTransactionId() {
    return createUuidV4() as TransactionId;
}

export type TransactionId = Brand<Uuid, 'transaction_id'>;

export function TransactionId() {
    return Uuid<TransactionId>();
}

// we need transaction events to inform clients when they can discard their optimistic state
// not all entity modifications emit transaction event, only those who don't use CRDT for sync (e.g. members)
export function TransactionEvent() {
    return Type.Object({
        kind: Type.Literal('transaction'),
        transactionId: TransactionId(),
        ts: Timestamp(),
    });
}

export interface TransactionEvent
    extends Static<ReturnType<typeof TransactionEvent>> {}

export interface MemberInfoChangeEvent
    extends Static<ReturnType<typeof MemberInfoChangeEvent>> {}

export function AttachmentChangeEvent() {
    return BaseChangeEvent<'attachment', AttachmentId, Attachment>(
        'attachment'
    );
}

export interface AttachmentChangeEvent
    extends Static<ReturnType<typeof AttachmentChangeEvent>> {}

type InferCrdtDiffValue<T extends CrdtDiff<any>> =
    T extends CrdtDiff<infer U> ? U : never;

type ExtractChangeEvents<T> =
    T extends BaseChangeEvent<any, any, any> ? T : never;

export type ChangeEventMapping = {
    [E in ExtractChangeEvents<ChangeEvent> as E['type']]: InferCrdtDiffValue<
        E['diff']
    >;
};

export function ChangeEvent() {
    return Type.Union([
        UserChangeEvent(),
        MemberChangeEvent(),
        BoardChangeEvent(),
        CardChangeEvent(),
        AccountChangeEvent(),
        ColumnChangeEvent(),
        MessageChangeEvent(),
        AttachmentChangeEvent(),
        MemberInfoChangeEvent(),
        TransactionEvent(),
    ]);
}

export type ChangeEvent = Static<ReturnType<typeof ChangeEvent>>;

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
        private readonly crypto: CryptoProvider,
        private readonly email: EmailProvider,
        private readonly uiUrl: string
    ) {
        this.esReader = new EventStoreReader(
            fn =>
                this.transact(
                    {
                        accountId: undefined,
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
        principal: Principal,
        fn: (tx: DataTx) => Promise<T>,
        overrideTransactionId?: TransactionId
    ): Promise<T> {
        const transactionId = overrideTransactionId ?? createTransactionId();
        let effects: AsyncCallback[] = [];
        const result = await this.kv.transact(async tx => {
            // clear effects because of transaction retries
            effects = [];
            let triggers: AsyncCallback[] = [];

            const scheduleTrigger = ((effect: AsyncCallback) =>
                triggers.push(effect)) as unknown as DataTriggerScheduler;

            const users = new UserRepo({
                tx: isolate(['users'])(tx),
                onChange: options => logUserChange(dataTx, options),
                scheduleTrigger,
            });
            const accounts = new AccountRepo({
                tx: isolate(['accounts'])(tx),
                userRepo: users,
                onChange: options => logAccountChange(dataTx, options),
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
                tx: isolate(['messages_v2'])(tx),
                cardRepo: cards,
                userRepo: users,
                boardRepo: boards,
                columnRepo: columns,
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

            const config: Config = {
                uiUrl: this.uiUrl,
            };

            const emailService = new EmailService(
                this.email,
                scheduleEffect,
                config
            );

            const timestamp = getNow();

            const boardService = new BoardService({
                boards,
                crypto: this.crypto,
                accounts,
                members,
                users,
                emailService,
                cards,
                columns,
                messages,
                timestamp,
            });

            const permissionService = new PermissionService(
                principal,
                () => dataTx
            );

            const memberService = new MemberService(
                members,
                boards,
                permissionService,
                emailService,
                principal
            );

            const version = new Cell(isolate(['version_v2'])(tx), 0);

            const dataTx: DataTx = {
                version,
                boardService,
                emailService,
                awareness,
                boards,
                cards,
                columns,
                attachments,
                messages,
                events,
                accounts,
                esWriter,
                users,
                members,
                memberService,
                permissionService,
                config,
                rawTx: tx,
                scheduleEffect,
                timestamp,
                transactionId,
            };

            const result = await fn(dataTx);

            while (triggers.length > 0) {
                log.info({msg: `running ${triggers.length} triggers...`});

                const triggersSnapshot = triggers;
                triggers = [];

                await whenAll(triggersSnapshot.map(trigger => trigger()));

                log.info({msg: 'triggers executed'});

                if (triggers.length > 0) {
                    log.info({msg: 'trigger recursion detected'});
                }
            }

            return result;
        });

        while (effects.length > 0) {
            log.info({msg: `running ${effects.length} effects...`});

            const effectsSnapshot = effects;
            effects = [];

            await whenAll(effectsSnapshot.map(effect => effect()));

            log.info({msg: 'effects executed'});

            if (effects.length > 0) {
                log.info({msg: 'effect recursion detected'});
            }
        }

        return result;
    }

    async upgrade() {
        const version = await this.transact(
            system,
            async tx => await tx.version.get()
        );

        log.info({msg: `Data layer current version: ${version}`});

        if (version <= 0) {
            log.info({msg: 'upgrading to version 1'});
            await this.upgradeToV1();
        }

        if (version <= 1) {
            log.info({msg: 'upgrading to version 2'});
            await this.upgradeToV2();
        }

        if (version <= 2) {
            log.info({msg: 'upgrading to version 3'});
            await this.upgradeToV3();
        }

        if (version <= 3) {
            log.info({msg: 'upgrading to version 4'});
            await this.upgradeToV4();
        }

        if (version <= 4) {
            log.info({msg: 'upgrading to version 5'});
            await this.upgradeToV5();
        }

        if (version <= 5) {
            log.info({msg: 'upgrading to version 6'});
            await this.upgradeToV6();
        }

        if (version <= 6) {
            log.info({msg: 'upgrading to version 7'});
            await this.upgradeToV7();
        }

        if (version <= 7) {
            log.info({msg: 'upgrading to version 8'});
            await this.upgradeToV8();
        }
    }

    private async upgradeToV1() {
        let membersUpdated = 0;
        await this.transact(system, async tx => {
            for await (const member of tx.members.rawRepo.scan()) {
                await tx.members.update(
                    member.id,
                    {excludeDeleted: false},
                    x => {
                        (x as Record<string, any>).inviteAccepted = true;
                        if (typeof x.position !== 'number') {
                            x.position = Math.random();
                        }
                    }
                );
                membersUpdated++;
            }
        });

        log.info({msg: `members updated: ${membersUpdated}`});

        await this.transact(system, tx => tx.version.put(1));
        log.info({msg: 'upgrading to version 1 done'});
    }

    private async upgradeToV2() {
        let boardsUpdated = 0;
        await this.transact(system, async tx => {
            for await (const board of tx.boards.rawRepo.scan()) {
                const joinCode = await createJoinCode(this.crypto);
                await tx.boards.update(board.id, x => {
                    x.joinCode = joinCode;
                    x.joinRole = 'admin';
                });
                boardsUpdated++;
            }
        });

        log.info({msg: `boards updated: ${boardsUpdated}`});

        await this.transact(system, tx => tx.version.put(2));
        log.info({msg: 'upgrading to version 2 done'});
    }

    private async upgradeToV3() {
        let boardsUpdated = 0;
        await this.transact(system, async tx => {
            for await (const board of tx.boards.rawRepo.scan()) {
                await tx.boards.update(board.id, x => {
                    x.joinRole = 'admin';
                });
                boardsUpdated++;
            }
        });

        log.info({msg: `boards updated: ${boardsUpdated}`});

        await this.transact(system, tx => tx.version.put(3));
        log.info({msg: 'upgrading to version 3 done'});
    }

    private async upgradeToV4() {
        let membersUpdated = 0;
        await this.transact(system, async tx => {
            for await (const member of tx.members.rawRepo.scan()) {
                await tx.members.update(
                    member.id,
                    {excludeDeleted: false},
                    x => {
                        delete (x as Record<string, any>).inviteAccepted;
                        (x as Record<string, any>).inviteStatus = 'accepted';
                    }
                );
                membersUpdated++;
            }
        });

        log.info({msg: `members updated: ${membersUpdated}`});

        await this.transact(system, tx => tx.version.put(4));
        log.info({msg: 'upgrading to version 4 done'});
    }

    private async upgradeToV5() {
        let membersUpdated = 0;
        await this.transact(system, async tx => {
            for await (const member of tx.members.rawRepo.scan()) {
                await tx.members.update(
                    member.id,
                    {excludeDeleted: false},
                    x => {
                        delete (x as Record<string, any>).inviteStatus;
                    }
                );
                membersUpdated++;
            }
        });

        log.info({msg: `members updated: ${membersUpdated}`});

        await this.transact(system, tx => tx.version.put(5));
        log.info({msg: 'upgrading to version 5 done'});
    }

    private async upgradeToV6() {
        // sets isDemo = false for all users
        let usersUpdated = 0;
        await this.transact(system, async tx => {
            for await (const user of tx.users.rawRepo.scan()) {
                await tx.users.update(user.id, x => {
                    (x as Record<string, any>).isDemo = false;
                });
                usersUpdated++;
            }
        });
        log.info({msg: `users updated: ${usersUpdated}`});
        await this.transact(system, tx => tx.version.put(6));
        log.info({msg: 'upgrading to version 6 done'});
    }

    private async upgradeToV7() {
        let boardsUpdated = 0;
        await this.transact(system, async tx => {
            for await (const board of tx.boards.rawRepo.scan()) {
                await tx.boards.update(board.id, x => {
                    (x as Record<string, any>).key = createUuidV4();
                });
                boardsUpdated++;
            }
        });

        log.info({msg: `boards updated: ${boardsUpdated}`});

        await this.transact(system, tx => tx.version.put(7));
        log.info({msg: 'upgrading to version 7 done'});
    }

    private async upgradeToV8() {
        let boardsUpdated = 0;
        await this.transact(system, async tx => {
            for await (const board of tx.boards.rawRepo.scan()) {
                await tx.boards.update(board.id, x => {
                    (x as Record<string, any>).key = createUuidV4().replaceAll(
                        '-',
                        ''
                    );
                });
                boardsUpdated++;
            }
        });

        log.info({msg: `boards updated: ${boardsUpdated}`});

        await this.transact(system, tx => tx.version.put(8));
        log.info({msg: 'upgrading to version 8 done'});
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

async function logAccountChange(
    tx: DataTx,
    {pk: [id], diff, kind}: ChangeOptions<Account>
) {
    const account = await tx.accounts.getById(id);
    assert(account !== undefined, `logAccountChange: account ${id} not found`);
    const members = await tx.members
        .getByUserId(account.userId, {excludeDeleted: false})
        .toArray();
    const event: AccountChangeEvent = {
        type: 'account',
        id,
        diff,
        ts: tx.timestamp,
        kind,
    };
    await whenAll([
        tx.esWriter.append(userEvents(account.userId), event),
        ...members.map(member =>
            tx.esWriter.append(boardEvents(member.boardId), {
                type: 'member_info',
                kind: 'snapshot',
                info: {
                    email: account.email,
                    role: member.role,
                    userId: member.userId,
                },
                ts: tx.timestamp,
            })
        ),
    ]);
}

async function logUserChange(
    tx: DataTx,
    {pk: [id], diff, kind}: ChangeOptions<User>
) {
    const members = await tx.members
        .getByUserId(id, {excludeDeleted: false})
        .toArray();
    const event: UserChangeEvent = {
        type: 'user',
        id,
        diff,
        ts: tx.timestamp,
        kind,
    };
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
    const event: BoardChangeEvent = {
        type: 'board',
        id,
        diff,
        ts: tx.timestamp,
        kind,
    };
    await whenAll([
        tx.esWriter.append(boardEvents(id), event),
        tx.members
            .getByBoardId(id, {excludeDeleted: true})
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
    const member = await tx.members.getById(id, {
        excludeDeleted: false,
    });
    assert(member !== undefined, `logMemberChange: member ${id} not found`);
    if (kind === 'create') {
        const board = await tx.boards.getById(member.boardId);
        assert(
            board !== undefined,
            `logMemberChange: board ${member.boardId} not found`
        );
        await tx.esWriter.append(userEvents(member.userId), {
            type: 'board',
            id: board.id,
            diff: board.state,
            ts: getNow(),
            kind: 'create',
        });
    }
    const event: MemberChangeEvent = {
        type: 'member',
        id,
        diff,
        ts: tx.timestamp,
        kind,
    };
    await whenAll([
        tx.esWriter.append(boardEvents(member.boardId), event),
        tx.esWriter.append(userEvents(member.userId), event),
    ]);

    const transactionEvent: TransactionEvent = {
        kind: 'transaction',
        transactionId: tx.transactionId,
        ts: tx.timestamp,
    };
    await whenAll([
        tx.esWriter.append(boardEvents(member.boardId), transactionEvent),
        tx.esWriter.append(userEvents(member.userId), transactionEvent),
    ]);
}

async function logCardChange(
    tx: DataTx,
    {pk: [id], diff, kind}: ChangeOptions<Card>
) {
    const card = await tx.cards.getById(id);
    assert(card !== undefined, `logCardChange: card ${id} not found`);
    const event: CardChangeEvent = {
        type: 'card',
        id,
        diff,
        ts: tx.timestamp,
        kind,
    };
    await tx.esWriter.append(boardEvents(card.boardId), event);
}

async function logColumnChange(
    tx: DataTx,
    {pk: [id], diff, kind}: ChangeOptions<Column>
) {
    const column = await tx.columns.getById(id);
    assert(column !== undefined, `logColumnChange: column ${id} not found`);
    const event: ColumnChangeEvent = {
        type: 'column',
        id,
        diff,
        ts: tx.timestamp,
        kind,
    };
    await tx.esWriter.append(boardEvents(column.boardId), event);
}

async function logMessageChange(
    tx: DataTx,
    {pk: [id], diff, kind}: ChangeOptions<Message>
) {
    const message = await tx.messages.getById(id);
    assert(message !== undefined, `logMessageChange: message ${id} not found`);
    const card = await tx.cards.getById(message.cardId);
    assert(
        card !== undefined,
        `logMessageChange: card ${message.cardId} not found`
    );
    const event: MessageChangeEvent = {
        type: 'message',
        id,
        diff,
        ts: tx.timestamp,
        kind,
    };
    await tx.esWriter.append(boardEvents(card.boardId), event);
}

async function logAttachmentChange(
    tx: DataTx,
    {pk: [id], diff, kind}: ChangeOptions<Attachment>
) {
    const attachment = await tx.attachments.getById(id);
    assert(
        attachment !== undefined,
        `logAttachmentChange: attachment ${id} not found`
    );
    const card = await tx.cards.getById(attachment.cardId);
    assert(
        card !== undefined,
        `logAttachmentChange: card ${attachment.cardId} not found`
    );
    const event: AttachmentChangeEvent = {
        type: 'attachment',
        id,
        diff,
        ts: tx.timestamp,
        kind,
    };
    await tx.esWriter.append(boardEvents(card.boardId), event);
}
