import {z} from 'zod';
import {CrdtDiff} from '../../crdt/crdt';
import {BusinessError} from '../../errors';
import {UniqueError} from '../../kv/data-index';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store';
import {zTimestamp} from '../../timestamp';
import {Brand} from '../../utils';
import {Uuid, createUuid, zUuid} from '../../uuid';
import {Doc, DocRepo, OnDocChange, SyncTarget} from '../doc-repo';
import {createWriteableChecker} from '../update-checker';
import {UserId} from './user-repo';

export type IdentityId = Brand<Uuid, 'identity_id'>;

export function createIdentityId(): IdentityId {
    return createUuid() as IdentityId;
}

export interface Identity extends Doc<IdentityId> {
    readonly userId: UserId;
    email: string;
    salt: string;
    passwordHash: string;
}

const EMAIL_INDEX = 'email';
const USER_ID_INDEX = 'userId';

export class EmailTakenIdentityRepoError extends BusinessError {}

export class IdentityRepo implements SyncTarget<Identity> {
    private readonly store: DocRepo<Identity>;

    constructor(txn: Uint8Transaction, onChange: OnDocChange<Identity>) {
        this.store = new DocRepo<Identity>({
            txn: withPrefix('d/')(txn),
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
            schema: z.object({
                id: zUuid<IdentityId>(),
                createdAt: zTimestamp(),
                updatedAt: zTimestamp(),
                userId: zUuid<UserId>(),
                email: z.string(),
                salt: z.string(),
                passwordHash: z.string(),
            }),
        });
    }

    async apply(id: Uuid, diff: CrdtDiff<Identity>): Promise<void> {
        return await this.store.apply(
            id,
            diff,
            createWriteableChecker({
                email: true,
                passwordHash: true,
                salt: true,
            })
        );
    }

    getById(id: IdentityId): Promise<Identity | undefined> {
        return this.store.getById(id);
    }

    getByEmail(email: string): Promise<Identity | undefined> {
        return this.store.getUnique(EMAIL_INDEX, [email]);
    }

    getByUserId(userId: UserId): Promise<Identity | undefined> {
        return this.store.getUnique(USER_ID_INDEX, [userId]);
    }

    async create(identity: Identity): Promise<void> {
        try {
            return await this.store.create(identity);
        } catch (err) {
            if (err instanceof UniqueError && err.indexName === EMAIL_INDEX) {
                throw new EmailTakenIdentityRepoError(`board with slug ${identity.email} already exists`);
            }

            throw err;
        }
    }

    update(id: IdentityId, recipe: (user: Identity) => Identity | undefined): Promise<Identity> {
        return this.store.update(id, recipe);
    }
}
