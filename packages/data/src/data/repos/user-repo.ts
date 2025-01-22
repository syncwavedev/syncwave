import {z} from 'zod';
import {CrdtDiff} from '../../crdt/crdt.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {zTimestamp} from '../../timestamp.js';
import {Brand} from '../../utils.js';
import {Uuid, createUuid, zUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, Recipe, SyncTarget} from '../doc-repo.js';
import {createWriteableChecker} from '../update-checker.js';

export type UserId = Brand<Uuid, 'user_id'>;

export function createUserId(): UserId {
    return createUuid() as UserId;
}

export interface User extends Doc<UserId> {}

export class UserRepo implements SyncTarget<User> {
    private readonly store: DocRepo<User>;

    constructor(txn: Uint8Transaction, onChange: OnDocChange<User>) {
        this.store = new DocRepo<User>({
            txn: withPrefix('d/')(txn),
            onChange,
            indexes: {},
            schema: z.object({
                id: zUuid<UserId>(),
                createdAt: zTimestamp(),
                updatedAt: zTimestamp(),
                name: z.string(),
            }),
        });
    }

    async apply(id: Uuid, diff: CrdtDiff<User>): Promise<void> {
        return await this.store.apply(
            id,
            diff,
            createWriteableChecker({
                name: true,
            })
        );
    }

    getById(id: UserId): Promise<User | undefined> {
        return this.store.getById(id);
    }

    async create(user: User): Promise<User> {
        return this.store.create(user);
    }

    update(id: UserId, recipe: Recipe<User>): Promise<User> {
        return this.store.update(id, recipe);
    }
}
