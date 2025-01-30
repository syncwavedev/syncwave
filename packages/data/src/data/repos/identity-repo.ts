import {z} from 'zod';
import {Context} from '../../context.js';
import {CrdtDiff} from '../../crdt/crdt.js';
import {BusinessError} from '../../errors.js';
import {UniqueError} from '../../kv/data-index.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Timestamp, zTimestamp} from '../../timestamp.js';
import {Brand} from '../../utils.js';
import {Uuid, createUuid, zUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, zDoc} from '../doc-repo.js';
import {createWriteableChecker} from '../update-checker.js';
import {UserId} from './user-repo.js';

export type IdentityId = Brand<Uuid, 'identity_id'>;

export function createIdentityId(): IdentityId {
    return createUuid() as IdentityId;
}

export interface VerificationCode {
    readonly code: string;
    readonly expires: Timestamp;
}

export interface Identity extends Doc<IdentityId> {
    readonly userId: UserId;
    email: string;
    verificationCode: VerificationCode;
    authActivityLog: Timestamp[];
}

const EMAIL_INDEX = 'email';
const USER_ID_INDEX = 'userId';

export class EmailTakenIdentityRepoError extends BusinessError {}

export function zIdentity() {
    return zDoc<IdentityId>().extend({
        userId: zUuid<UserId>(),
        email: z.string(),
        authActivityLog: z.array(zTimestamp()),
        verificationCode: z.object({
            code: z.string(),
            expires: zTimestamp(),
        }),
    });
}

export class IdentityRepo {
    public readonly rawRepo: DocRepo<Identity>;

    constructor(tx: Uint8Transaction, onChange: OnDocChange<Identity>) {
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
        });
    }

    getById(ctx: Context, id: IdentityId): Promise<Identity | undefined> {
        return this.rawRepo.getById(ctx, id);
    }

    getByEmail(ctx: Context, email: string): Promise<Identity | undefined> {
        return this.rawRepo.getUnique(ctx, EMAIL_INDEX, [email]);
    }

    getByUserId(ctx: Context, userId: UserId): Promise<Identity | undefined> {
        return this.rawRepo.getUnique(ctx, USER_ID_INDEX, [userId]);
    }

    async apply(
        ctx: Context,
        id: Uuid,
        diff: CrdtDiff<Identity>
    ): Promise<void> {
        return await this.rawRepo.apply(
            ctx,
            id,
            diff,
            createWriteableChecker({
                email: true,
                verificationCode: true,
                authActivityLog: true,
            })
        );
    }

    async create(ctx: Context, identity: Identity): Promise<Identity> {
        try {
            return await this.rawRepo.create(ctx, identity);
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
        ctx: Context,
        id: IdentityId,
        recipe: (user: Identity) => Identity | void
    ): Promise<Identity> {
        return this.rawRepo.update(ctx, id, recipe);
    }
}
