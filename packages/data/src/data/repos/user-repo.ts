import {z} from 'zod';
import {CrdtDiff} from '../../crdt/crdt.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {assertNever, Brand} from '../../utils.js';
import {createUuid, Uuid, zUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, Recipe, zDoc} from '../doc-repo.js';

export type UserId = Brand<Uuid, 'user_id'>;

export function createUserId(): UserId {
    return createUuid() as UserId;
}

interface UserV1 extends Doc<[UserId]> {
    readonly id: UserId;
}

interface UserV2 extends Doc<[UserId]> {
    readonly id: UserId;
    readonly version: 2;
    name: string;
}

interface UserV3 extends Doc<[UserId]> {
    readonly id: UserId;
    readonly version: 3;
    fullName: string;
}

interface UserV4 extends Doc<[UserId]> {
    readonly id: UserId;
    readonly version: '4';
    fullName: string;
}

export type User = UserV4;

type StoredUser = UserV1 | UserV2 | UserV3 | UserV4;

export function zUser() {
    return zDoc(z.tuple([zUuid<UserId>()])).extend({
        id: zUuid<UserId>(),
        fullName: z.string(),
        version: z.literal('4'),
    });
}

export class UserRepo {
    public readonly rawRepo: DocRepo<User>;

    constructor(tx: Uint8Transaction, onChange: OnDocChange<User>) {
        this.rawRepo = new DocRepo<User>({
            tx: withPrefix('d/')(tx),
            onChange,
            indexes: {},
            schema: zUser(),
            constraints: [],
            readonly: {
                id: true,
                fullName: false,
                version: true,
            },
            upgrade: function upgradeUser(user: StoredUser) {
                if ('version' in user) {
                    if (user.version === 2) {
                        (user as any).version = 3;
                        (user as any).fullName = user.name;
                        delete (user as any).name;

                        upgradeUser(user);
                    } else if (user.version === 3) {
                        (user as any).version = '4';

                        upgradeUser(user);
                    } else if (user.version === '4') {
                        // latest version
                    } else {
                        assertNever(user);
                    }
                } else {
                    (user as any).version = 2;
                    (user as any).name = 'Anon';

                    upgradeUser(user);
                }
            },
        });
    }

    getById(id: UserId, includeDeleted: boolean): Promise<User | undefined> {
        return this.rawRepo.getById([id], includeDeleted);
    }

    async apply(id: Uuid, diff: CrdtDiff<User>): Promise<void> {
        return await this.rawRepo.apply([id], diff);
    }

    async create(user: Omit<User, 'pk'>): Promise<User> {
        return this.rawRepo.create({pk: [user.id], ...user});
    }

    update(
        id: UserId,
        recipe: Recipe<User>,
        includeDeleted = false
    ): Promise<User> {
        return this.rawRepo.update([id], recipe, includeDeleted);
    }
}
