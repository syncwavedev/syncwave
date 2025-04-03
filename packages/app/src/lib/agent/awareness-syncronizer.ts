import {
    assert,
    BatchProcessor,
    Deferred,
    infiniteRetry,
    log,
    toError,
    type Awareness,
    type AwarenessState,
    type BoardId,
} from 'syncwave';
import type {Rpc} from '../utils';

export class AwarenessSynchronizer {
    static start(awareness: Awareness, boardId: BoardId, rpc: Rpc) {
        const synchronizer = new AwarenessSynchronizer(awareness, boardId, rpc);

        synchronizer.startPush().catch(error => {
            log.error(toError(error), 'failed to start awareness pusher');
        });
        synchronizer.startPull().catch(error => {
            log.error(toError(error), 'failed to start awareness puller');
        });

        return synchronizer;
    }

    private readonly awarenessSender: BatchProcessor<AwarenessState>;
    private readonly destroySignal = new Deferred<void>();
    private isActive = true;

    private constructor(
        private readonly awareness: Awareness,
        private readonly boardId: BoardId,
        private readonly rpc: Rpc
    ) {
        this.awarenessSender = new BatchProcessor<AwarenessState>({
            state: {type: 'running'},
            // delay to batch async bursts of awareness updates
            // in particular it helps for tiptap initial focus with awareness
            enqueueDelay: 10,
            process: (states: AwarenessState[]) => {
                const latestState = states.at(-1);
                assert(
                    latestState !== undefined,
                    'awareness latest state not found'
                );

                // don't wait for result to allow sending multiple updates concurrently
                rpc(x =>
                    x.updateBoardAwarenessState({
                        clientId: awareness.clientId,
                        boardId: boardId,
                        state: latestState,
                    })
                ).catch(error => {
                    log.error(toError(error), 'failed to send awareness state');
                });

                return Promise.resolve();
            },
        });
    }

    private async startPull() {
        await infiniteRetry(
            () => this.pull(),
            `awareness pull, board id = ${this.boardId}`
        );
    }

    private async pull() {
        const updates = this.rpc(x =>
            x.joinBoardAwareness({
                boardId: this.boardId,
                state: this.awareness.getLocalState(),
                clientId: this.awareness.clientId,
            })
        );

        for await (const update of updates) {
            this.awareness.applyRemote(
                update.states.map(({clientId, state}) => ({
                    key: clientId,
                    value: state,
                }))
            );
        }
    }

    private async startPush() {
        const handleUpdate = (_: unknown, origin: unknown) => {
            if (origin !== 'local') return;

            this.awarenessSender
                .enqueue(this.awareness.getLocalState())
                .catch(error => {
                    log.error(
                        toError(error),
                        'failed to enqueue local awareness'
                    );
                });
        };

        this.awareness.on('update', handleUpdate);
        this.destroySignal.promise.then(() => {
            this.awareness.off('update', handleUpdate);
        });

        await this.rpc(x =>
            x.updateBoardAwarenessState({
                clientId: this.awareness.clientId,
                boardId: this.boardId,
                state: this.awareness.getLocalState(),
            })
        );
    }

    destroy(reason: unknown) {
        this.isActive = false;
        this.destroySignal.resolve();
        this.awarenessSender.close(reason);
    }
}
