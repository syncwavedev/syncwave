/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    assert,
    assertNever,
    BatchProcessor,
    Crdt,
    log,
    runAll,
    Uuid,
    type BaseChangeEvent,
    type ChangeEvent,
    type ChangeEventMapping,
    type CoordinatorRpc,
    type CrdtDiff,
    type DiffOptions,
    type Recipe,
    type Unsubscribe,
} from 'syncwave';
import {deriveCrdtSnapshot} from './crdt.svelte.js';

export interface CrdtDerivator {
    view(state: EntityState): any;
}

interface BaseEntity<TType extends string, TId extends Uuid, TValue> {
    readonly type: TType;
    readonly id: TId;
    readonly crdt: Crdt<TValue>;
    // note: there is no unused draft cleanup logic right now
    isDraft: boolean;
}

class DiffSender<T> {
    private readonly batchProcessor: BatchProcessor<CrdtDiff<T>>;

    constructor(
        private readonly rpc: CoordinatorRpc,
        private readonly entity: Entity
    ) {
        this.batchProcessor = new BatchProcessor({
            state: this.entity.isDraft ? {type: 'idle'} : {type: 'running'},
            process: this.process.bind(this),
            enqueueDelay: 10,
        });
    }

    async start() {
        this.batchProcessor.start();
    }

    async enqueue(diff: CrdtDiff<T>) {
        this.batchProcessor.enqueue(diff);
    }

    private async process(batch: Array<CrdtDiff<T>>) {
        await this.send(Crdt.merge(batch));
    }

    close(reason: unknown): void {
        this.batchProcessor.close(reason);
    }

    private async send(diff: CrdtDiff<any>) {
        if (this.entity.type === 'card') {
            await this.rpc.applyCardDiff({
                cardId: this.entity.id,
                diff,
            });
        } else if (this.entity.type === 'user') {
            await this.rpc.applyUserDiff({
                userId: this.entity.id,
                diff,
            });
        } else if (this.entity.type === 'column') {
            await this.rpc.applyColumnDiff({
                columnId: this.entity.id,
                diff,
            });
        } else if (this.entity.type === 'board') {
            await this.rpc.applyBoardDiff({
                boardId: this.entity.id,
                diff,
            });
        } else if (this.entity.type === 'attachment') {
            throw new Error('Attachment diff not supported');
        } else if (this.entity.type === 'account') {
            throw new Error('Account diff not supported');
        } else if (this.entity.type === 'member') {
            throw new Error('Member diff not supported');
        } else if (this.entity.type === 'message') {
            throw new Error('Message diff not supported');
        } else {
            assertNever(this.entity);
        }
    }
}

interface BaseEntityState<TType extends string, TId extends Uuid, TValue> {
    readonly type: TType;
    readonly id: TId;
    readonly state: CrdtDiff<TValue>;
    readonly isDraft: boolean;
}

type Entity = ChangeEvent extends infer T
    ? T extends BaseChangeEvent<infer TType, infer TId, infer TValue>
        ? BaseEntity<TType, TId, TValue>
        : never
    : never;

interface EntityObserver {
    sender: DiffSender<any>;
    close: Unsubscribe;
}

interface EntityBox {
    entity: Entity;
    view: any;
    viewUnsub: Unsubscribe;
    observer: EntityObserver;
}

export type EntityState = ChangeEvent extends infer T
    ? T extends BaseChangeEvent<infer TType, infer TId, infer TValue>
        ? BaseEntityState<TType, TId, TValue>
        : never
    : never;

export type EntityType = keyof ChangeEventMapping;

const REMOTE_ORIGIN = {origin: 'remote'};

export class CrdtManager implements CrdtDerivator {
    private readonly entities = new Map<Uuid, EntityBox>();

    constructor(private readonly rpc: CoordinatorRpc) {}

    applyRemoteChange(event: ChangeEvent) {
        if (event.kind === 'create') {
            this.load({
                id: event.id,
                state: event.diff,
                type: event.type,
            } as EntityState);
        } else if (event.kind === 'update') {
            const entity = this.entities.get(event.id)?.entity;
            assert(entity !== undefined, 'apply: Crdt not found');
            assert(entity.type === event.type, 'apply: Crdt type mismatch');
            entity.crdt.apply(event.diff as CrdtDiff<any>, {
                origin: REMOTE_ORIGIN,
            });
        } else {
            assertNever(event.kind);
        }
    }

    view(state: EntityState): any {
        return this.load(state).view;
    }

    tryViewById<K extends keyof ChangeEventMapping>(
        id: Uuid,
        type: K
    ): ChangeEventMapping[K] | undefined {
        const box = this.entities.get(id);
        if (box === undefined) {
            return undefined;
        }

        assert(box.entity.type === type, 'viewById: Crdt type mismatch');
        return box.view;
    }

    viewById<K extends keyof ChangeEventMapping>(
        id: Uuid,
        type: K
    ): ChangeEventMapping[K] {
        const result = this.tryViewById(id, type);
        assert(result !== undefined, 'viewById: Crdt not found');
        return result;
    }

    createDraft(entity: EntityState) {
        const existing = this.entities.get(entity.id);
        assert(existing === undefined, 'create: Crdt already exists');
        const box = this.load(entity);

        box.observer.sender.enqueue(box.entity.crdt.state());

        return box;
    }

    commit(id: Uuid): void {
        const box = this.entities.get(id);
        assert(box !== undefined, 'commit: Crdt not found');
        if (box.entity.isDraft === false) {
            log.warn({msg: 'commit: Crdt already committed, id = ' + id});
        }
        box.entity.isDraft = false;
        box.observer.sender.start().catch(error => {
            log.error({
                error,
                msg: 'CrdtManager: commit error',
            });
        });
    }

    update<T>(id: Uuid, recipe: Recipe<T>) {
        const crdt = this.entities.get(id)?.entity.crdt;
        assert(crdt !== undefined, 'Crdt not found');
        const diff = (crdt as Crdt<T>).update(recipe);

        return diff;
    }

    close(reason: unknown) {
        runAll(
            [...this.entities.values()].flatMap(entity => [
                () => entity.viewUnsub(reason),
                () => entity.observer.close(reason),
                () => entity.observer.sender.close(reason),
            ])
        );
    }

    private load({id, type, state, isDraft}: EntityState) {
        const box = this.entities.get(id);
        if (box) {
            assert(box.entity.type === type, 'load: Crdt type mismatch');
            box.entity.crdt.apply(state as CrdtDiff<any>);

            return box;
        } else {
            const crdt = Crdt.load(state as CrdtDiff<any>);
            const [view, viewUnsub] = deriveCrdtSnapshot(crdt);
            const entity = {
                crdt,
                id,
                type,
                isDraft,
            } as Entity;
            const box: EntityBox = {
                entity,
                view,
                viewUnsub,
                observer: this.observe(entity),
            };
            this.entities.set(id, box);
            return box;
        }
    }

    private observe(entity: Entity): EntityObserver {
        const sender = new DiffSender(this.rpc, entity);

        return {
            sender,
            close: entity.crdt.onUpdate((diff, {origin}: DiffOptions) => {
                if (origin !== REMOTE_ORIGIN) {
                    sender.enqueue(diff);
                }
            }),
        };
    }
}
