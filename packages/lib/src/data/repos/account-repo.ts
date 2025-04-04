import {type Static, Type} from '@sinclair/typebox';
import type {CrdtDiff} from '../../crdt/crdt.js';
import {BusinessError} from '../../errors.js';
import {UniqueError} from '../../kv/data-index.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {zTimestamp} from '../../timestamp.js';
import {type Brand} from '../../utils.js';
import {createUuid, Uuid} from '../../uuid.js';
import type {DataTriggerScheduler} from '../data-layer.js';
import {
    type CrdtDoc,
    DocRepo,
    type OnDocChange,
    type Recipe,
    zDoc,
} from '../doc-repo.js';
import type {TransitionChecker} from '../transition-checker.js';
import {type UserId, UserRepo} from './user-repo.js';

export type AccountId = Brand<Uuid, 'account_id'>;

export function createAccountId(): AccountId {
    return createUuid() as AccountId;
}

const EMAIL_INDEX = 'email';
const USER_ID_INDEX = 'userId';

export class EmailTakenAccountRepoError extends BusinessError {}

export function zVerificationCode() {
    return Type.Object({
        code: Type.String(),
        expires: zTimestamp(),
    });
}

export interface VerificationCode
    extends Static<ReturnType<typeof zVerificationCode>> {}

export function zAccount() {
    return Type.Composite([
        zDoc(Type.Tuple([Uuid<AccountId>()])),
        Type.Object({
            id: Uuid<AccountId>(),
            userId: Uuid<UserId>(),
            email: Type.String(),
            authActivityLog: Type.Array(zTimestamp()),
            verificationCode: zVerificationCode(),
        }),
    ]);
}

export interface Account extends Static<ReturnType<typeof zAccount>> {}

export class AccountRepo {
    public readonly rawRepo: DocRepo<Account>;

    constructor(params: {
        tx: AppTransaction;
        userRepo: UserRepo;
        onChange: OnDocChange<Account>;
        scheduleTrigger: DataTriggerScheduler;
    }) {
        this.rawRepo = new DocRepo<Account>({
            tx: isolate(['d'])(params.tx),
            scheduleTrigger: params.scheduleTrigger,
            indexes: {
                [EMAIL_INDEX]: {
                    key: x => [x.email],
                    unique: true,
                    include: x => x.email !== undefined,
                },
                [USER_ID_INDEX]: {
                    key: x => [x.userId],
                    unique: true,
                },
            },
            onChange: params.onChange,
            schema: zAccount(),
            constraints: [
                {
                    name: 'account.userId fk',
                    verify: async account => {
                        const user = await params.userRepo.getById(
                            account.userId,
                            {includeDeleted: true}
                        );
                        if (user === undefined) {
                            return `user with userId ${account.userId} does not exist`;
                        }

                        return;
                    },
                },
            ],
        });
    }

    getById(id: AccountId): Promise<Account | undefined> {
        return this.rawRepo.getById([id]);
    }

    getByEmail(email: string): Promise<Account | undefined> {
        return this.rawRepo.getUnique(EMAIL_INDEX, [email]);
    }

    getByUserId(userId: UserId): Promise<CrdtDoc<Account> | undefined> {
        return this.rawRepo.getUnique(USER_ID_INDEX, [userId]);
    }

    async apply(
        id: Uuid,
        diff: CrdtDiff<Account>,
        checker: TransitionChecker<Account>
    ) {
        return await this.rawRepo.apply([id], diff, checker);
    }

    async create(account: Omit<Account, 'pk'>): Promise<Account> {
        try {
            return await this.rawRepo.create({pk: [account.id], ...account});
        } catch (err) {
            if (err instanceof UniqueError && err.indexName === EMAIL_INDEX) {
                throw new EmailTakenAccountRepoError(
                    `user with email ${account.email} already exists`,
                    'account_email_taken'
                );
            }

            throw err;
        }
    }

    update(id: AccountId, recipe: Recipe<Account>): Promise<Account> {
        return this.rawRepo.update([id], recipe);
    }
}
