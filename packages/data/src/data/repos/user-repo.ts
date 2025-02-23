import {z} from 'zod';
import {type CrdtDiff} from '../../crdt/crdt.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {assertNever, type Brand} from '../../utils.js';
import {createUuid, Uuid, zUuid} from '../../uuid.js';
import {
    type Doc,
    DocRepo,
    type OnDocChange,
    type Recipe,
    zDoc,
} from '../doc-repo.js';
import {type ObjectKey, zObjectKey} from '../infrastructure.js';
import type {TransitionChecker} from '../transition-checker.js';

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

export interface UserV4 extends Doc<[UserId]> {
    readonly id: UserId;
    readonly version: '4';
    fullName: string;
    avatarKey?: ObjectKey;
}

export type User = UserV4;

type StoredUser = UserV1 | UserV2 | UserV3 | UserV4;

export function zUser() {
    return zDoc(z.tuple([zUuid<UserId>()])).extend({
        id: zUuid<UserId>(),
        fullName: z.string(),
        version: z.literal('4'),
        avatarKey: zObjectKey().optional(),
    });
}

export class UserRepo {
    public readonly rawRepo: DocRepo<User>;

    constructor(tx: AppTransaction, onChange: OnDocChange<User>) {
        this.rawRepo = new DocRepo<User>({
            tx: isolate(['d'])(tx),
            onChange,
            indexes: {},
            schema: zUser(),
            constraints: [],
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

    getById(id: UserId, includeDeleted: boolean) {
        return this.rawRepo.getById([id], includeDeleted);
    }

    async apply(
        id: Uuid,
        diff: CrdtDiff<User>,
        checker: TransitionChecker<User>
    ) {
        return await this.rawRepo.apply([id], diff, checker);
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
