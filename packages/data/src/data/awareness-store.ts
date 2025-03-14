import type {AwarenessState} from '../awareness.js';
import {MsgpackCodec} from '../codec.js';
import {AppError} from '../errors.js';
import {
    isolate,
    withCodec,
    withPacker,
    type AppTransaction,
    type Transaction,
} from '../kv/kv-store.js';
import {toStream} from '../stream.js';
import {NumberPacker} from '../tuple.js';
import {assert, pipe, whenAll} from '../utils.js';
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
        return new AwarenessRoom(isolate([room])(this.rooms));
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

export interface AwarenessStateEntry {
    clientId: number;
    userId: UserId;
    state: AwarenessState;
}

class AwarenessRoom {
    private readonly states: Transaction<number, AwarenessState>;
    private readonly owners: Transaction<number, UserId>;
    constructor(tx: AppTransaction) {
        this.states = pipe(
            tx,
            isolate(['states_1']),
            withPacker(new NumberPacker()),
            withCodec<AwarenessState>(new MsgpackCodec())
        );
        this.owners = pipe(
            tx,
            isolate(['owners_1']),
            withPacker(new NumberPacker()),
            withCodec(new MsgpackCodec())
        );
    }
    async create(userId: UserId, clientId: number, state: AwarenessState) {
        await whenAll([
            this.states.put(clientId, state),
            this.owners.get(clientId).then(async existing => {
                if (existing) {
                    throw new AwarenessConflictError(clientId);
                }

                await this.owners.put(clientId, userId);
            }),
        ]);
    }

    async update(userId: UserId, clientId: number, state: AwarenessState) {
        await whenAll([
            this.states.put(clientId, state),
            this.owners.get(clientId).then(ownerId => {
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
            this.states.delete(clientId),
            this.owners.delete(clientId),
        ]);
    }

    async getAll(): Promise<AwarenessStateEntry[]> {
        const [owners, states] = await whenAll([
            toStream(this.owners.query({gte: 0})).toArray(),
            toStream(this.states.query({gte: 0})).toArray(),
        ]);

        return states.map(({key: clientId, value}): AwarenessStateEntry => {
            const ownerId = owners.find(o => o.key === clientId)?.value;

            assert(
                ownerId !== undefined,
                'AwarenessStore.getAll: meta not found for client ' + clientId
            );

            return {
                clientId,
                state: value,
                userId: ownerId,
            };
        });
    }
}
