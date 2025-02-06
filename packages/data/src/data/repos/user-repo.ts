import {z} from 'zod';
import {CrdtDiff} from '../../crdt/crdt.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Brand} from '../../utils.js';
import {Uuid, createUuid, zUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, Recipe, zDoc} from '../doc-repo.js';
import {createWriteableChecker} from '../update-checker.js';

export type UserId = Brand<Uuid, 'user_id'>;

export function createUserId(): UserId {
    return createUuid() as UserId;
}

export interface User extends Doc<[UserId]> {
    readonly id: UserId;
}

export function zUser() {
    return zDoc(z.tuple([zUuid<UserId>()])).extend({
        id: zUuid<UserId>(),
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
        });
    }

    getById(id: UserId): Promise<User | undefined> {
        return this.rawRepo.getById([id]);
    }

    async apply(id: Uuid, diff: CrdtDiff<User>): Promise<void> {
        return await this.rawRepo.apply(
            [id],
            diff,
            createWriteableChecker({
                name: true,
            })
        );
    }

    async create(user: Omit<User, 'pk'>): Promise<User> {
        return this.rawRepo.create({pk: [user.id], ...user});
    }

    update(id: UserId, recipe: Recipe<User>): Promise<User> {
        return this.rawRepo.update([id], recipe);
    }
}
