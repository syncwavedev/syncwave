import {z} from 'zod';
import {CrdtDiff} from '../../crdt/crdt.js';
import {BusinessError} from '../../errors.js';
import {UniqueError} from '../../kv/data-index.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Timestamp, zTimestamp} from '../../timestamp.js';
import {Brand} from '../../utils.js';
import {Uuid, createUuid, zUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, zDoc} from '../doc-repo.js';
import {createWriteableChecker} from '../update-checker.js';
import {UserId, UserRepo} from './user-repo.js';

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
        tx: Uint8Transaction,
        userRepo: UserRepo,
        onChange: OnDocChange<Identity>
    ) {
        this.rawRepo = new DocRepo<Identity>({
            tx: withPrefix('d/')(tx),
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
                        const user = await userRepo.getById(identity.userId);
                        return user !== undefined;
                    },
                },
            ],
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

    async apply(id: Uuid, diff: CrdtDiff<Identity>): Promise<void> {
        return await this.rawRepo.apply(
            [id],
            diff,
            createWriteableChecker({
                email: true,
                verificationCode: true,
                authActivityLog: true,
            })
        );
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

    update(
        id: IdentityId,
        recipe: (user: Identity) => Identity | void
    ): Promise<Identity> {
        return this.rawRepo.update([id], recipe);
    }
}
