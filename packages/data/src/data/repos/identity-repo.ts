import {z} from 'zod';
import type {CrdtDiff} from '../../crdt/crdt.js';
import {BusinessError} from '../../errors.js';
import {UniqueError} from '../../kv/data-index.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {type Timestamp, zTimestamp} from '../../timestamp.js';
import {type Brand} from '../../utils.js';
import {Uuid, createUuid, zUuid} from '../../uuid.js';
import {
    type Doc,
    DocRepo,
    type OnDocChange,
    type Recipe,
    zDoc,
} from '../doc-repo.js';
import type {TransitionChecker} from '../transition-checker.js';
import {type UserId, UserRepo} from './user-repo.js';

export type IdentityId = Brand<Uuid, 'identity_id'>;

export function createIdentityId(): IdentityId {
    return createUuid() as IdentityId;
}

export interface VerificationCode {
    readonly code: string;
    readonly expires: Timestamp;
}

export interface Identity extends Doc<[IdentityId]> {
    readonly id: IdentityId;
    readonly userId: UserId;
    email: string;
    verificationCode: VerificationCode;
    authActivityLog: Timestamp[];
}

const EMAIL_INDEX = 'email';
const USER_ID_INDEX = 'userId';

export class EmailTakenIdentityRepoError extends BusinessError {}

export function zVerificationCode() {
    return z.object(
        {
            code: z.string(),
            expires: zTimestamp(),
        },
        {
            description: 'VerificationCode',
        }
    );
}

export function zIdentity() {
    return zDoc(z.tuple([zUuid<IdentityId>()])).extend({
        id: zUuid<IdentityId>(),
        userId: zUuid<UserId>(),
        email: z.string(),
        authActivityLog: z.array(zTimestamp()),
        verificationCode: zVerificationCode(),
    });
}

export class IdentityRepo {
    public readonly rawRepo: DocRepo<Identity>;

    constructor(
        tx: AppTransaction,
        userRepo: UserRepo,
        onChange: OnDocChange<Identity>
    ) {
        this.rawRepo = new DocRepo<Identity>({
            tx: isolate(['d'])(tx),
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
            onChange,
            schema: zIdentity(),
            constraints: [
                {
                    name: 'identity.userId fk',
                    verify: async identity => {
                        const user = await userRepo.getById(
                            identity.userId,
                            true
                        );
                        if (user === undefined) {
                            return `user with userId ${identity.userId} does not exist`;
                        }

                        return;
                    },
                },
            ],
            readonly: {
                email: false,
                verificationCode: false,
                authActivityLog: false,
                id: true,
                userId: true,
            },
        });
    }

    getById(id: IdentityId): Promise<Identity | undefined> {
        return this.rawRepo.getById([id]);
    }

    getByEmail(email: string): Promise<Identity | undefined> {
        return this.rawRepo.getUnique(EMAIL_INDEX, [email]);
    }

    getByUserId(userId: UserId): Promise<Identity | undefined> {
        return this.rawRepo.getUnique(USER_ID_INDEX, [userId]);
    }

    async apply(
        id: Uuid,
        diff: CrdtDiff<Identity>,
        checker: TransitionChecker<Identity>
    ) {
        return await this.rawRepo.apply([id], diff, checker);
    }

    async create(identity: Omit<Identity, 'pk'>): Promise<Identity> {
        try {
            return await this.rawRepo.create({pk: [identity.id], ...identity});
        } catch (err) {
            if (err instanceof UniqueError && err.indexName === EMAIL_INDEX) {
                throw new EmailTakenIdentityRepoError(
                    `user with email ${identity.email} already exists`,
                    'identity_email_taken'
                );
            }

            throw err;
        }
    }

    update(id: IdentityId, recipe: Recipe<Identity>): Promise<Identity> {
        return this.rawRepo.update([id], recipe);
    }
}
