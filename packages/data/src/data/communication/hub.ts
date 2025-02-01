import {z, ZodType} from 'zod';
import {astream, AsyncStream, toObservable} from '../../async-stream.js';
import {logger} from '../../logger.js';
import {assertNever, Observer, Subject} from '../../utils.js';
import {createRpcClient, RpcServer} from '../rpc/rpc-engine.js';
import {
    applyMiddleware,
    createApi,
    handler,
    InferRpcClient,
    streamer,
} from '../rpc/rpc.js';
import {Message} from './message.js';
import {PersistentConnection} from './persistent-connection.js';
import {TransportClient, TransportServer} from './transport.js';

export class HubClient<T> {
    private readonly server: HubServerRpc<T>;

    constructor(
        transportClient: TransportClient<Message>,
        schema: ZodType<T>,
        authSecret: string
    ) {
        const conn = new PersistentConnection(transportClient);
        this.server = createRpcClient(createHubServerApi(schema), conn, () => ({
            auth: authSecret,
        }));
    }

    // next waits for all subscribers to do their work
    async publish(topic: string, message: T) {
        await this.server.publish({topic, message});
    }

    async throw(topic: string, error: string) {
        await this.server.throw({topic, error});
    }

    async subscribe(topic: string): Promise<AsyncStream<T>> {
        const response = this.server.subscribe({topic}) as AsyncIterable<
            {type: 'start'} | {type: 'message'; message: T}
        >;
        return toObservable(
            astream(response).map(x => {
                if (x.type === 'start') {
                    return {
                        type: 'start',
                        initialValue: undefined,
                    };
                } else if (x.type === 'message') {
                    return {
                        type: 'next',
                        value: x.message,
                    };
                } else {
                    assertNever(x);
                }
            })
        ).then(x => astream<T>(x[1]));
    }
}

export class HubServer<T> {
    private readonly rpcServer: RpcServer<HubServerRpcState<T>>;

    constructor(
        transport: TransportServer<Message>,
        schema: ZodType<T>,
        authSecret: string
    ) {
        this.rpcServer = new RpcServer(
            transport,
            createHubServerApi(schema),
            {
                authSecret,
                subjects: new SubjectManager(),
            },
            'HUB'
        );
    }

    async launch(): Promise<void> {
        await this.rpcServer.launch();
    }

    close() {
        this.rpcServer.close();
    }
}

class SubjectManager<T> {
    private subjects = new Map<string, Subject<T>>();

    async next(topic: string, value: T) {
        await this.subjects.get(topic)?.next(value);
    }

    async throw(topic: string, error: Error) {
        await this.subjects.get(topic)?.throw(error);
    }

    subscribe(topic: string, observer: Observer<T>) {
        let subject = this.subjects.get(topic);
        if (!subject) {
            subject = new Subject();
            this.subjects.set(topic, subject);
        }
        subject.subscribe({
            next: value => observer.next(value),
            throw: error => observer.throw(error),
            close: () => {
                observer.close();
                if (!subject.anyObservers) {
                    this.subjects.delete(topic);
                }
            },
        });
    }

    value$(topic: string) {
        let subject = this.subjects.get(topic);
        if (!subject) {
            subject = new Subject();
            this.subjects.set(topic, subject);
        }

        return subject.value$().finally(() => {
            if (!subject.anyObservers) {
                this.subjects.delete(topic);
            }
        });
    }
}

interface HubServerRpcState<T> {
    authSecret: string;
    subjects: SubjectManager<T>;
}

function createHubServerApi<T>(zMessage: ZodType<T>) {
    const api1 = createApi<HubServerRpcState<T>>()({
        publish: handler({
            req: z.object({
                topic: z.string(),
                message: zMessage,
            }),
            res: z.void(),
            handle: async (state, {topic, message}) => {
                await state.subjects.next(topic, message!);
            },
        }),
        throw: handler({
            req: z.object({topic: z.string(), error: z.string()}),
            res: z.void(),
            handle: async (state, {topic, error}) => {
                await state.subjects.throw(
                    topic,
                    new Error('EventHubServerApi.throw', {cause: error})
                );
            },
        }),
        subscribe: streamer({
            req: z.object({topic: z.string()}),
            item: z.discriminatedUnion('type', [
                z.object({type: z.literal('start')}),
                z.object({type: z.literal('message'), message: zMessage}),
            ]),
            async *stream(
                {subjects},
                {topic}
            ): AsyncIterable<
                | {type: 'start'}
                | {type: 'message'; message: z.infer<typeof zMessage>}
            > {
                logger.log('hub subscribe');
                const message$ = subjects.value$(topic);
                yield {type: 'start'};
                logger.log('hub subscribe after start');
                for await (const message of message$) {
                    logger.log('hub yield message');
                    yield {type: 'message', message};
                    logger.log('hub yield after');
                }
            },
        }),
    });

    const api2 = applyMiddleware(
        api1,
        async (next, state: HubServerRpcState<T>, headers) => {
            if (headers.auth !== state.authSecret) {
                throw new Error(
                    `HubServer: authentication failed: ${state.authSecret} !== ${headers.auth}`
                );
            }

            await next(state);
        }
    );

    return api2;
}

type HubServerRpc<T> = InferRpcClient<ReturnType<typeof createHubServerApi<T>>>;
