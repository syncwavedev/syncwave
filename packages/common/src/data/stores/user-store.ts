import {Uint8Transaction, withPrefix} from '../../kv/kv-store';
import {Brand} from '../../utils';
import {Uuid} from '../../uuid';
import {DocStore, OnDocChange} from '../doc-store';

export type UserId = Brand<Uuid, 'user_id'>;

export interface User {
    id: UserId;
    name: string;
    email: string;
}

export class UserStore {
    private readonly store: DocStore<User>;

    constructor(txn: Uint8Transaction, onChange: OnDocChange<User>) {
        this.store = new DocStore<User>({
            txn: withPrefix('d/')(txn),
            indexes: {
                email: {
                    key: x => [x.email],
                    unique: true,
                },
            },
            onChange,
        });
    }

    getById(id: UserId): Promise<User | undefined> {
        return this.store.getById(id);
    }

    getByEmail(email: string): Promise<User | undefined> {
        return this.store.getUnique('email', [email]);
    }

    create(user: User): Promise<void> {
        return this.store.create(user);
    }

    update(id: UserId, recipe: (user: User) => User | undefined): Promise<User> {
        return this.store.update(id, recipe);
    }
}
