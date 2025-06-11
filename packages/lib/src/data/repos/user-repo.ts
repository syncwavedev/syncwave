import {type Static, Type} from '@sinclair/typebox';
import {type CrdtDiff} from '../../crdt/crdt.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {type Brand} from '../../utils.js';
import {createUuid, Uuid} from '../../uuid.js';
import type {DataTriggerScheduler} from '../data-layer.js';
import {ObjectKey} from '../infrastructure.js';
import type {TransitionChecker} from '../transition-checker.js';
import {
    CrdtRepo,
    type OnCrdtChange,
    type QueryOptions,
    type Recipe,
} from './base/crdt-repo.js';
import {Doc} from './base/doc.js';

export function UserId() {
    return Uuid<UserId>();
}

export type UserId = Brand<Uuid, 'user_id'>;

export function createUserId(): UserId {
    return createUuid() as UserId;
}

export function User() {
    return Type.Composite([
        Doc(Type.Tuple([Uuid<UserId>()])),
        Type.Object({
            id: Uuid<UserId>(),
            fullName: Type.String(),
            avatarKey: Type.Optional(ObjectKey()),
            isDemo: Type.Boolean(),
        }),
    ]);
}

export interface User extends Static<ReturnType<typeof User>> {}

export class UserRepo {
    public readonly rawRepo: CrdtRepo<User>;

    constructor(params: {
        tx: AppTransaction;
        onChange: OnCrdtChange<User>;
        scheduleTrigger: DataTriggerScheduler;
    }) {
        this.rawRepo = new CrdtRepo<User>({
            tx: isolate(['d'])(params.tx),
            onChange: params.onChange,
            indexes: {},
            schema: User(),
            constraints: [],
            scheduleTrigger: params.scheduleTrigger,
        });
    }

    getById(id: UserId, options?: QueryOptions) {
        return this.rawRepo.getById([id], options);
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
        options?: QueryOptions
    ): Promise<User> {
        return this.rawRepo.update([id], recipe, options);
    }
}
