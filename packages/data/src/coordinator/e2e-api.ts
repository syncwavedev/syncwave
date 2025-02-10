import {z} from 'zod';
import {RPC_CALL_TIMEOUT_MS} from '../constants.js';
import {createTraceId} from '../context.js';
import {toCursor} from '../cursor.js';
import {ChangeEvent, Transact} from '../data/data-layer.js';
import {EventStoreReader} from '../data/event-store.js';
import {BusinessError} from '../errors.js';
import {observable, toStream} from '../stream.js';
import {
    createApi,
    decorateApi,
    handler,
    Processor,
    streamer,
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
            req: z.object({msg: z.string()}),
            res: z.object({msg: z.string()}),
            handle: async (state, {msg}, headers) => {
                return {msg};
            },
        }),
        e2eCounter: streamer({
            req: z.object({count: z.number()}),
            item: z.number(),
            async *stream(state, {count}, headers) {
                for (let i = 0; i < count; i++) {
                    yield i;
                    await wait({ms: 100, onCancel: 'reject'});
                }
            },
        }),
        e2eObservable: streamer({
            req: z.object({initialValue: z.number()}),
            item: z.number(),
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
            req: z.object({}),
            res: z.object({}),
            handle: async () => {
                throw new BusinessError('Test error', 'unknown');
            },
        }),
        e2eTimeout: handler({
            req: z.object({}),
            res: z.object({}),
            handle: async () => {
                await wait({
                    ms: RPC_CALL_TIMEOUT_MS + 1000,
                    onCancel: 'reject',
                });
                return {};
            },
        }),
        e2eSystemState: handler({
            req: z.object({}),
            res: z.object({
                runningProcessIds: z.array(z.string()),
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
                        const traceId = ctx.headers.traceId ?? createTraceId();
                        try {
                            runningProcessIds.add(traceId);
                            return processor.handle(state, arg, ctx);
                        } finally {
                            runningProcessIds.delete(traceId);
                        }
                    },
                };
            } else if (processor.type === 'streamer') {
                return {
                    ...processor,
                    stream: (state, arg, ctx) => {
                        const traceId = ctx.headers.traceId ?? createTraceId();
                        runningProcessIds.add(traceId);
                        return toStream(
                            processor.stream(state, arg, ctx)
                        ).finally(() => {
                            runningProcessIds.delete(traceId);
                        });
                    },
                };
            } else {
                assertNever(processor);
            }
        }
    );
}
