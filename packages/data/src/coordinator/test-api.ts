import {z} from 'zod';
import {Crdt} from '../crdt/crdt.js';
import {ChangeEvent, Transact} from '../data/data-layer.js';
import {EventStoreReader} from '../data/event-store.js';
import {createUserId, User} from '../data/repos/user-repo.js';
import {log} from '../logger.js';
import {observable} from '../stream.js';
import {getNow} from '../timestamp.js';
import {createApi, handler, observer, streamer} from '../transport/rpc.js';
import {wait} from '../utils.js';

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
                await wait({ms: 1000, onCancel: 'reject'});
                yield 2;
                await wait({ms: 1000, onCancel: 'reject'});
                yield 3;
                await wait({ms: 1000, onCancel: 'reject'});
                yield 4;
                await wait({ms: 1000, onCancel: 'reject'});
                yield 5;
            },
        }),
        echo: handler({
            req: z.object({msg: z.string()}),
            res: z.object({msg: z.string()}),
            handle: async (state, {msg}) => {
                return {msg};
            },
        }),
        // streaming example
        getStream: streamer({
            req: z.object({topic: z.string()}),
            item: z.object({index: z.number(), value: z.string()}),
            async *stream({esReader}, {topic}) {
                log.debug('stream start');
                let index = 1;
                while (true) {
                    log.debug('stream yield');
                    yield {index: index++, value: 'sdf'};
                    await wait({ms: 1000, onCancel: 'reject'});
                }
            },
        }),
        getObserve: observer({
            req: z.object({topic: z.string()}),
            value: z.object({index: z.number(), value: z.string()}),
            update: z.object({index: z.number(), value: z.string()}),
            async observe({esReader}, {topic}) {
                return observable({
                    async get() {
                        return {index: 1, value: 'sdf'};
                    },
                    update$: esReader
                        .subscribe(topic, 0)
                        .then(x => x.map(() => undefined)),
                });
            },
        }),
        streamPut: handler({
            req: z.object({topic: z.string(), value: z.string()}),
            res: z.object({}),
            handle: async (state, {topic, value}) => {
                await state.transact(async tx => {
                    const userId = createUserId();
                    await tx.esWriter.append(topic, {
                        type: 'user',
                        id: createUserId(),
                        ts: getNow(),
                        diff: Crdt.from<User>({
                            pk: [userId],
                            id: userId,
                            deleted: false,
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
