import {Uint8Transaction, withPrefix} from '../../kv/kv-store';
import {Brand} from '../../utils';
import {Uuid, createUuid} from '../../uuid';
import {Doc, DocRepo, OnDocChange} from '../doc-repo';
import {UserId} from './user-repo';

export type IdentityId = Brand<Uuid, 'identity_id'>;

export function createIdentityId(): IdentityId {
    return createUuid() as IdentityId;
}

export interface Identity extends Doc<IdentityId> {
    email: string;
    userId: UserId;
    salt: string;
    passwordHash: string;
}

const EMAIL_INDEX = 'email';
const USER_ID_INDEX = 'userId';

export class IdentityRepo {
    private readonly store: DocRepo<Identity>;

    constructor(txn: Uint8Transaction, onChange: OnDocChange<Identity>) {
        this.store = new DocRepo<Identity>({
            txn: withPrefix('d/')(txn),
            indexes: {
                [EMAIL_INDEX]: {
                    key: x => [x.email],
                    unique: true,
                },
                [USER_ID_INDEX]: {
                    key: x => [x.userId],
                    unique: true,
                },
            },
            onChange,
        });
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

    create(user: Identity): Promise<void> {
        return this.store.create(user);
    }

    update(id: IdentityId, recipe: (user: Identity) => Identity | undefined): Promise<Identity> {
        return this.store.update(id, recipe);
    }
}
