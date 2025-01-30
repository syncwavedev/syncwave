import {z} from 'zod';
import {observable, wait} from '../../utils.js';
import {EventStoreReader} from '../communication/event-store.js';
import {Transact} from '../data-layer.js';
import {createApi, handler, observer, streamer} from '../rpc/rpc.js';

export interface TestApiState {
    esReader: EventStoreReader<{value: string}>;
    transact: Transact;
}

export function createTestApi() {
    return createApi<TestApiState>()({
        getArr: streamer({
            req: z.object({}),
            item: z.number(),
            async *stream(ctx) {
                yield 1;
                await wait(ctx, 1000);
                yield 2;
                await wait(ctx, 1000);
                yield 3;
                await wait(ctx, 1000);
                yield 4;
                await wait(ctx, 1000);
                yield 5;
            },
        }),
        // streaming example
        getStream: observer({
            req: z.object({topic: z.string()}),
            value: z.object({index: z.number(), value: z.string()}),
            async observe(ctx, {esReader}, {topic}) {
                return observable(ctx, {
                    async get(ctx) {
                        return {index: 1, value: 'sdf'};
                    },
                    update$: esReader.subscribe(ctx, topic, 0),
                });
            },
        }),
        streamPut: handler({
            req: z.object({topic: z.string(), value: z.string()}),
            res: z.object({}),
            handle: async (ctx, state, {topic, value}) => {
                await state.transact(ctx, async (ctx, tx) => {
                    await tx.esWriter.append(ctx, topic, {value});
                });
                return {};
            },
        }),
    });
}
