import {z} from 'zod';
import {isCancelledError, wait} from '../../utils.js';
import {BusConsumer, BusProducer} from '../communication/bus.js';
import {HubClient} from '../communication/hub.js';
import {createApi, handler, streamer} from '../communication/rpc.js';

export interface TestApiState {
    hub: HubClient<{value: string}>;
    busProducer: BusProducer<{value: string}>;
    busConsumer: BusConsumer<{value: string}>;
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
        getStream: streamer({
            req: z.object({topic: z.string()}),
            item: z.object({index: z.number(), value: z.string()}),
            async *stream(ctx, {busConsumer}, {topic}) {
                console.log('stream start');
                try {
                    let index = 0;
                    for await (const {value} of busConsumer.subscribe(
                        ctx,
                        topic,
                        0
                    )) {
                        console.log('stream item', index, value);
                        yield {index, value};
                        index += 1;
                    }

                    console.log('stream complete');
                } catch (error) {
                    if (isCancelledError(error)) {
                        console.log('stream cancelled');
                    } else {
                        console.log('stream error', error);
                    }
                } finally {
                    console.log('stream closed');
                }
            },
        }),
        streamPut: handler({
            req: z.object({topic: z.string(), value: z.string()}),
            res: z.object({}),
            handle: async (ctx, state, {topic, value}) => {
                await state.busProducer.publish(ctx, topic, {value});
                return {};
            },
        }),
    });
}
