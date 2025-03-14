import type {AwarenessState} from '../awareness.js';
import {MsgpackCodec} from '../codec.js';
import {AppError} from '../errors.js';
import {
    isolate,
    withCodec,
    type AppTransaction,
    type Entry,
} from '../kv/kv-store.js';
import {toStream} from '../stream.js';
import {pipe, whenAll} from '../utils.js';
import {type UserId} from './repos/user-repo.js';

export class AwarenessStore {
    private readonly rooms: AppTransaction;
    constructor(tx: AppTransaction) {
        this.rooms = pipe(tx, isolate(['rooms']));
    }

    async create(
        room: string,
        userId: UserId,
        clientId: number,
        state: AwarenessState
    ): Promise<void> {
        await this.room(room).create(userId, clientId, state);
    }

    async put(
        room: string,
        userId: UserId,
        clientId: number,
        state: AwarenessState
    ) {
        await this.room(room).update(userId, clientId, state);
    }

    async offline(room: string, clientId: number) {
        await this.room(room).offline(clientId);
    }

    async getAll(room: string) {
        return await this.room(room).getAll();
    }

    private room(room: string): AwarenessRoom {
        return new AwarenessRoom(this.rooms, room);
    }
}

export class AwarenessConflictError extends AppError {
    constructor(public readonly clientId: number) {
        super(`awareness client ${clientId} already exists`);
    }
}

export interface AwarenessOwnershipErrorOptions {
    readonly userId: UserId;
    readonly ownerId: UserId | undefined;
    readonly clientId: number;
}

export class AwarenessOwnershipError extends AppError {
    public readonly userId: UserId;
    public readonly ownerId: UserId | undefined;
    public readonly clientId: number;

    constructor({userId, ownerId, clientId}: AwarenessOwnershipErrorOptions) {
        super(
            `user ${userId} is not the owner (${ownerId}) of client ${clientId}`
        );

        this.userId = userId;
        this.ownerId = ownerId;
        this.clientId = clientId;
    }
}

class AwarenessRoom {
    private readonly states: AppTransaction<AwarenessState>;
    private readonly owners: AppTransaction<UserId>;
    constructor(tx: AppTransaction, room: string) {
        this.states = pipe(
            tx,
            isolate(['states']),
            withCodec<AwarenessState>(new MsgpackCodec())
        );
        this.owners = pipe(
            tx,
            isolate([room, 'owners']),
            withCodec<UserId>(new MsgpackCodec())
        );
    }
    async create(userId: UserId, clientId: number, state: AwarenessState) {
        await whenAll([
            this.states.put([clientId], {userId, state}),
            this.owners.get([clientId]).then(async existing => {
                if (existing) {
                    throw new AwarenessConflictError(clientId);
                }

                await this.owners.put([clientId], userId);
            }),
        ]);
    }

    async update(userId: UserId, clientId: number, state: AwarenessState) {
        await whenAll([
            this.states.put([clientId], state),
            this.owners.get([clientId]).then(ownerId => {
                if (ownerId !== userId) {
                    throw new AwarenessOwnershipError({
                        clientId,
                        userId,
                        ownerId,
                    });
                }
            }),
        ]);
    }

    async offline(clientId: number) {
        await whenAll([
            this.states.delete([clientId]),
            this.owners.delete([clientId]),
        ]);
    }

    async getAll(): Promise<Array<Entry<number, AwarenessState>>> {
        const states = await toStream(this.states.query({gte: []})).toArray();
        return states.map(
            ({key, value}): Entry<number, AwarenessState> => ({
                key: key[0] as number,
                value: value,
            })
        );
    }
}
