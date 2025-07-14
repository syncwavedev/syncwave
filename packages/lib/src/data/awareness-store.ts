import type {AwarenessState} from '../awareness.js';
import {MsgpackCodec} from '../codec.js';
import {AWARENESS_OFFLINE_TIMEOUT_MS} from '../constants.js';
import {AppError} from '../errors.js';
import {
    getSnapshotStats,
    isolate,
    withCodec,
    withPacker,
    type AppTransaction,
    type Transaction,
} from '../kv/kv-store.js';
import {toStream} from '../stream.js';
import {getNow, type Timestamp} from '../timestamp.js';
import {NumberPacker} from '../tuple.js';
import {assert, pipe, whenAll} from '../utils.js';
import {type UserId} from './repos/user-repo.js';

export class AwarenessStore {
    private readonly rooms: AppTransaction;
    constructor(tx: AppTransaction) {
        this.rooms = pipe(tx, isolate(['rooms']));
    }

    async put(
        room: string,
        userId: UserId,
        clientId: number,
        state: AwarenessState
    ) {
        await this.room(room).put(userId, clientId, state);
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
    private readonly updatedAt: Transaction<number, Timestamp>;
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
        this.updatedAt = pipe(
            tx,
            isolate(['updatedAt_2']),
            withPacker(new NumberPacker()),
            withCodec<Timestamp>(new MsgpackCodec<Timestamp>())
        );
    }

    async put(userId: UserId, clientId: number, state: AwarenessState) {
        await whenAll([
            this.states.put(clientId, state),
            this.updatedAt.put(clientId, getNow()),
            this.owners.get(clientId).then(async ownerId => {
                if (ownerId === undefined) {
                    await this.owners.put(clientId, userId);
                } else if (ownerId !== userId) {
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
            this.updatedAt.delete(clientId),
            this.owners.delete(clientId),
        ]);
    }

    async getAll(): Promise<AwarenessStateEntry[]> {
        // const [owners, updatedAtInfo, states] = await whenAll([
        //     toStream(this.owners.query({gte: 0})).toArray(),
        //     toStream(this.updatedAt.query({gte: 0})).toArray(),
        //     toStream(this.states.query({gte: 0})).toArray(),
        // ]);

        const ownersStatsBefore = getSnapshotStats(this.owners);
        const owners = await toStream(this.owners.query({gte: 0})).toArray();
        const ownersStatsAfter = getSnapshotStats(this.owners);

        const updatedAtStatsBefore = getSnapshotStats(this.updatedAt);
        const updatedAtInfo = await toStream(
            this.updatedAt.query({gte: 0})
        ).toArray();
        const updatedAtStatsAfter = getSnapshotStats(this.updatedAt);

        const statesStatsBefore = getSnapshotStats(this.states);
        const states = await toStream(this.states.query({gte: 0})).toArray();
        const statesStatsAfter = getSnapshotStats(this.states);

        console.log(
            'owners',
            JSON.stringify(
                {
                    before: ownersStatsBefore,
                    after: ownersStatsAfter,
                },
                null,
                2
            )
        );

        const offlineIds: number[] = [];

        const result = states.flatMap(
            ({key: clientId, value}): AwarenessStateEntry[] => {
                const ownerId = owners.find(o => o.key === clientId)?.value;
                const updatedAt =
                    updatedAtInfo.find(u => u.key === clientId)?.value ?? -1;

                assert(
                    ownerId !== undefined,
                    'AwarenessStore.getAll: meta not found for client ' +
                        clientId
                );

                if (getNow() - updatedAt >= AWARENESS_OFFLINE_TIMEOUT_MS) {
                    offlineIds.push(clientId);
                    return [];
                }

                return [
                    {
                        clientId,
                        state: value,
                        userId: ownerId,
                    },
                ];
            }
        );

        if (offlineIds.length > 0) {
            await whenAll(offlineIds.map(clientId => this.offline(clientId)));
        }

        return result;
    }
}
