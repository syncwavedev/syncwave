import {CrdtSerializer} from '../../crdt-serializer';
import {Crdt, CrdtDiff} from '../../crdt/crdt';
import {Uint8Transaction, withKeySerializer, withPrefix, withValueSerializer} from '../../kv/kv-store';
import {StringSerializer} from '../../string-serializer';
import {Brand, pipe} from '../../utils';
import {Uuid, UuidSerializer} from '../../uuid';

export type UserId = Brand<Uuid, 'user_id'>;

export interface User {
    id: UserId;
    name: string;
    email: string;
}

export interface UserRepository {
    getById(id: UserId): Promise<Crdt<User> | undefined>;
    getByEmail(email: string): Promise<Crdt<User> | undefined>;
    create(user: Crdt<User>): Promise<void>;
    update(id: UserId, diff: CrdtDiff<User>): Promise<Crdt<User>>;
}

export function getUserStore(txn: Uint8Transaction): UserRepository {
    const primaryIndex = pipe(
        txn,
        withPrefix('users/primary/'),
        withKeySerializer(new UuidSerializer()),
        withValueSerializer(new CrdtSerializer<User>())
    );

    const emailIndex = pipe(
        txn,
        withPrefix('users/email/'),
        withKeySerializer(new StringSerializer()),
        withValueSerializer(new UuidSerializer())
    );

    async function put(user: Crdt<User>) {
        const userId = user.snapshot().id;
        const email = user.snapshot().email;

        await primaryIndex.put(userId, user);

        const existingUserWithEmail = await emailIndex.get(email);
        if (existingUserWithEmail !== undefined && existingUserWithEmail !== userId) {
            throw new Error(`user with email ${email} already exists`);
        }

        await emailIndex.put(email, userId);
    }

    return {
        getById: id => primaryIndex.get(id),
        getByEmail: async email => {
            const userId = await emailIndex.get(email);
            if (userId) {
                return await primaryIndex.get(userId);
            }

            return undefined;
        },
        update: async (id, diff) => {
            const user = await primaryIndex.get(id);
            if (!user) {
                throw new Error(`user ${id} not found`);
            }

            user.apply(diff);

            await put(user);

            return user;
        },
        create: async user => {
            const userId = user.snapshot().id;
            const existingUser = await primaryIndex.get(userId);
            if (existingUser !== undefined) {
                throw new Error(`user ${userId} already exists`);
            }

            await put(user);
        },
    };
}
