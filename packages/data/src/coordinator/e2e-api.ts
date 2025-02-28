import {Type} from '@sinclair/typebox';
import {RPC_CALL_TIMEOUT_MS} from '../constants.js';
import {context} from '../context.js';
import {toCursor} from '../cursor.js';
import type {ChangeEvent, Transact} from '../data/data-layer.js';
import {EventStoreReader} from '../data/event-store.js';
import {BusinessError} from '../errors.js';
import {observable, toStream} from '../stream.js';
import {
    createApi,
    decorateApi,
    handler,
    streamer,
    type Processor,
} from '../transport/rpc.js';
import {assertNever, wait} from '../utils.js';

export interface E2eApiState {
    esReader: EventStoreReader<ChangeEvent>;
    transact: Transact;
}

export function createE2eApi() {
    const runningProcessIds = new Set<string>();

    const api = createApi<E2eApiState>()({
        e2eEcho: handler({
            req: Type.Object({msg: Type.String()}),
            res: Type.Object({msg: Type.String()}),
            handle: async (state, {msg}, headers) => {
                return {msg};
            },
        }),
        e2eCounter: streamer({
            req: Type.Object({count: Type.Number()}),
            item: Type.Number(),
            async *stream(state, {count}, headers) {
                for (let i = 0; i < count; i++) {
                    yield i;
                    await wait({ms: 100, onCancel: 'reject'});
                }
            },
        }),
        e2eObservable: streamer({
            req: Type.Object({initialValue: Type.Number()}),
            item: Type.Number(),
            async *stream(state, {initialValue}, headers) {
                let currentValue = initialValue;
                yield* observable({
                    async get() {
                        return currentValue;
                    },
                    update$: Promise.resolve(
                        toCursor(
                            (async function* () {
                                for (let i = 0; i < 3; i += 1) {
                                    currentValue += 1;
                                    yield undefined;
                                }
                            })()
                        )
                    ),
                });
            },
        }),
        e2eError: handler({
            req: Type.Object({}),
            res: Type.Object({}),
            handle: async () => {
                throw new BusinessError('Test error', 'unknown');
            },
        }),
        e2eTimeout: handler({
            req: Type.Object({}),
            res: Type.Object({}),
            handle: async () => {
                await wait({
                    ms: RPC_CALL_TIMEOUT_MS + 1000,
                    onCancel: 'reject',
                });
                return {};
            },
        }),
        echo: handler({
            req: Type.Object({msg: Type.String()}),
            res: Type.Object({msg: Type.String()}),
            handle: async (state, {msg}) => {
                return {msg};
            },
        }),
        e2eSystemState: handler({
            req: Type.Object({}),
            res: Type.Object({
                runningProcessIds: Type.Array(Type.String()),
            }),
            handle: async () => {
                return {
                    runningProcessIds: Array.from(runningProcessIds),
                };
            },
        }),
    });

    return decorateApi<E2eApiState, E2eApiState, typeof api>(
        api,
        (processor): Processor<E2eApiState, unknown, unknown> => {
            if (processor.type === 'handler') {
                return {
                    ...processor,
                    handle: async (state, arg, ctx) => {
                        try {
                            runningProcessIds.add(context().traceId);
                            return processor.handle(state, arg, ctx);
                        } finally {
                            runningProcessIds.delete(context().traceId);
                        }
                    },
                };
            } else if (processor.type === 'streamer') {
                return {
                    ...processor,
                    stream: (state, arg, ctx) => {
                        runningProcessIds.add(context().traceId);
                        return toStream(
                            processor.stream(state, arg, ctx)
                        ).finally(() => {
                            runningProcessIds.delete(context().traceId);
                        });
                    },
                };
            } else {
                assertNever(processor);
            }
        }
    );
}
