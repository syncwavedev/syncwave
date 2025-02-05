import {z} from 'zod';
import {toCursor} from '../../cursor.js';
import {observable, wait} from '../../utils.js';
import {EventStoreReader} from '../communication/event-store.js';
import {ChangeEvent, Transact} from '../data-layer.js';
import {createApi, handler, observer, streamer} from '../rpc/rpc.js';

export interface E2eApiState {
    esReader: EventStoreReader<ChangeEvent>;
    transact: Transact;
}

export function createE2eApi() {
    return createApi<E2eApiState>()({
        e2eEcho: handler({
            req: z.object({msg: z.string()}),
            res: z.object({msg: z.string()}),
            handle: async (state, {msg}) => {
                return {msg};
            },
        }),
        e2eCounter: streamer({
            req: z.object({count: z.number()}),
            item: z.number(),
            async *stream(state, {count}) {
                for (let i = 0; i < count; i++) {
                    yield i;
                    await wait(100);
                }
            },
        }),
        e2eObservable: observer({
            req: z.object({initialValue: z.number()}),
            value: z.number(),
            update: z.number(),
            async observe(state, {initialValue}) {
                let currentValue = initialValue;
                return observable({
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
                throw new Error('Test error');
            },
        }),
    });
}
