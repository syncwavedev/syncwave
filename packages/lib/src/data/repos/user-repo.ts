import {type Static, Type} from '@sinclair/typebox';
import {type CrdtDiff} from '../../crdt/crdt.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {type Brand} from '../../utils.js';
import {createUuid, Uuid} from '../../uuid.js';
import type {DataTriggerScheduler} from '../data-layer.js';
import {DocRepo, type OnDocChange, type Recipe, zDoc} from '../doc-repo.js';
import {zObjectKey} from '../infrastructure.js';
import type {TransitionChecker} from '../transition-checker.js';

export type UserId = Brand<Uuid, 'user_id'>;

export function createUserId(): UserId {
    return createUuid() as UserId;
}

export function zUser() {
    return Type.Composite([
        zDoc(Type.Tuple([Uuid<UserId>()])),
        Type.Object({
            id: Uuid<UserId>(),
            fullName: Type.String(),
            avatarKey: Type.Optional(zObjectKey()),
        }),
    ]);
}

export interface User extends Static<ReturnType<typeof zUser>> {}

export class UserRepo {
    public readonly rawRepo: DocRepo<User>;

    constructor(params: {
        tx: AppTransaction;
        onChange: OnDocChange<User>;
        scheduleTrigger: DataTriggerScheduler;
    }) {
        this.rawRepo = new DocRepo<User>({
            tx: isolate(['d'])(params.tx),
            onChange: params.onChange,
            indexes: {},
            schema: zUser(),
            constraints: [],
            scheduleTrigger: params.scheduleTrigger,
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
