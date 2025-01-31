import {CrdtDiff} from '../../crdt/crdt.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Brand} from '../../utils.js';
import {Uuid, createUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, Recipe, zDoc} from '../doc-repo.js';
import {createWriteableChecker} from '../update-checker.js';

export type UserId = Brand<Uuid, 'user_id'>;

export function createUserId(): UserId {
    return createUuid() as UserId;
}

export interface User extends Doc<UserId> {}

export function zUser() {
    return zDoc<UserId>().extend({});
}

export class UserRepo {
    public readonly rawRepo: DocRepo<User>;

    constructor(tx: Uint8Transaction, onChange: OnDocChange<User>) {
        this.rawRepo = new DocRepo<User>({
            tx: withPrefix('d/')(tx),
            onChange,
            indexes: {},
            schema: zUser(),
        });
    }

    getById(id: UserId): Promise<User | undefined> {
        return this.rawRepo.getById(id);
    }

    async apply(id: Uuid, diff: CrdtDiff<User>): Promise<void> {
        return await this.rawRepo.apply(
            id,
            diff,
            createWriteableChecker({
                name: true,
            })
        );
    }

    async create(user: User): Promise<User> {
        return this.rawRepo.create(user);
    }

    update(id: UserId, recipe: Recipe<User>): Promise<User> {
        return this.rawRepo.update(id, recipe);
    }
}
