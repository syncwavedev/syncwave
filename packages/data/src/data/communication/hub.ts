import {z, ZodType} from 'zod';
import {AsyncStream, ColdStream} from '../../async-stream.js';
import {Cancellation} from '../../cancellation.js';
import {Observer, Subject} from '../../utils.js';
import {Message} from './message.js';
import {PersistentConnection} from './persistent-connection.js';
import {
    applyMiddleware,
    createApi,
    createRpcClient,
    handler,
    InferRpcClient,
    mapApiState,
    ProcessorContext,
    RpcServer,
    streamer,
} from './rpc.js';
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
    async publish(topic: string, message: T, cx: Cancellation) {
        await this.server.publish({topic, message}, cx);
    }

    async throw(topic: string, error: string, cx: Cancellation) {
        await this.server.throw({topic, error}, cx);
    }

    subscribe(topic: string, cx: Cancellation): AsyncStream<T> {
        return this.server.subscribe({topic}, cx).map(x => x.message!);
    }
}

export class HubServer<T> {
    private readonly rpcServer: RpcServer<HubServerRpcState<T>>;

    constructor(
        transport: TransportServer<Message>,
        schema: ZodType<T>,
        authSecret: string
    ) {
        this.rpcServer = new RpcServer(transport, createHubServerApi(schema), {
            authSecret,
            subjects: new SubjectManager(),
        });
    }

    async launch(): Promise<void> {
        await this.rpcServer.launch();
    }

    async close() {
        await this.rpcServer.close();
    }
}

class SubjectManager<T> {
    private subjects = new Map<string, Subject<T>>();

    async next(topic: string, value: T) {
        await this.subjects.get(topic)?.next(value);
    }

    async throw(topic: string, error: unknown) {
        await this.subjects.get(topic)?.throw(error);
    }

    subscribe(topic: string, observer: Observer<T>, cx: Cancellation) {
        let subject = this.subjects.get(topic);
        if (!subject) {
            subject = new Subject();
            this.subjects.set(topic, subject);
        }
        subject.subscribe(
            {
                ...observer,
                close: async () => {
                    await observer.close();
                    if (!subject.anyObservers) {
                        this.subjects.delete(topic);
                    }
                },
            },
            cx
        );
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
                await state.subjects.throw(topic, new Error(error));
            },
        }),
        subscribe: streamer({
            req: z.object({topic: z.string()}),
            item: z.object({message: zMessage}),
            stream({subjects}, {topic}, cx) {
                return new ColdStream((exe, exeCx) => {
                    subjects.subscribe(
                        topic,
                        {
                            next: message => exe.next({message: message}),
                            throw: async error => {
                                await exe.throw(error);
                            },
                            close: async () => exe.end(),
                        },
                        exeCx.combine(cx)
                    );
                });
            },
        }),
    });

    const api2 = mapApiState(
        api1,
        ({state}: ProcessorContext<HubServerRpcState<T>>) => state
    );

    const api3 = applyMiddleware(
        api2,
        async (next, state: ProcessorContext<HubServerRpcState<T>>) => {
            if (state.message.headers?.auth !== state.state.authSecret) {
                throw new Error('HubServer: authentication failed');
            }

            await next(state);
        }
    );

    return api3;
}

type HubServerRpc<T> = InferRpcClient<ReturnType<typeof createHubServerApi<T>>>;
