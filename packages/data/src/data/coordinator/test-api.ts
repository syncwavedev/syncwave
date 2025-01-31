import {z} from 'zod';
import {Crdt} from '../../crdt/crdt.js';
import {getNow} from '../../timestamp.js';
import {observable, wait} from '../../utils.js';
import {EventStoreReader} from '../communication/event-store.js';
import {ChangeEvent, Transact} from '../data-layer.js';
import {createUserId, User} from '../repos/user-repo.js';
import {createApi, handler, observer, streamer} from '../rpc/rpc.js';

export interface TestApiState {
    esReader: EventStoreReader<ChangeEvent>;
    transact: Transact;
}

export function createTestApi() {
    return createApi<TestApiState>()({
        getArr: streamer({
            req: z.object({}),
            item: z.number(),
            async *stream(cx) {
                yield 1;
                await wait(1000);
                yield 2;
                await wait(1000);
                yield 3;
                await wait(1000);
                yield 4;
                await wait(1000);
                yield 5;
            },
        }),
        // streaming example
        getStream: observer({
            req: z.object({topic: z.string()}),
            value: z.object({index: z.number(), value: z.string()}),
            async observe({esReader}, {topic}) {
                return observable({
                    async get() {
                        return {index: 1, value: 'sdf'};
                    },
                    update$: esReader.subscribe(topic, 0),
                });
            },
        }),
        streamPut: handler({
            req: z.object({topic: z.string(), value: z.string()}),
            res: z.object({}),
            handle: async (state, {topic, value}) => {
                await state.transact(async tx => {
                    await tx.esWriter.append(topic, {
                        type: 'user',
                        id: createUserId(),
                        ts: getNow(),
                        diff: Crdt.from<User>({
                            id: createUserId(),
                            createdAt: getNow(),
                            updatedAt: getNow(),
                        }).state(),
                    });
                });
                return {};
            },
        }),
    });
}
