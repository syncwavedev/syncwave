import {Cx} from '../../context.js';
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

    constructor(cx: Cx, tx: Uint8Transaction, onChange: OnDocChange<User>) {
        this.rawRepo = new DocRepo<User>(cx, {
            tx: withPrefix(cx, 'd/')(tx),
            onChange,
            indexes: {},
            schema: zUser(),
        });
    }

    getById(cx: Cx, id: UserId): Promise<User | undefined> {
        return this.rawRepo.getById(cx, id);
    }

    async apply(cx: Cx, id: Uuid, diff: CrdtDiff<User>): Promise<void> {
        return await this.rawRepo.apply(
            cx,
            id,
            diff,
            createWriteableChecker({
                name: true,
            })
        );
    }

    async create(cx: Cx, user: User): Promise<User> {
        return this.rawRepo.create(cx, user);
    }

    update(cx: Cx, id: UserId, recipe: Recipe<User>): Promise<User> {
        return this.rawRepo.update(cx, id, recipe);
    }
}
