import {z, ZodType} from 'zod';
import {Cursor} from '../cursor.js';
import {AppError} from '../errors.js';
import {Observer, Subject} from '../subject.js';
import {Message} from '../transport/message.js';
import {PersistentConnection} from '../transport/persistent-connection.js';
import {
    applyMiddleware,
    createApi,
    createRpcClient,
    handler,
    InferRpcClient,
    RpcServer,
    streamer,
} from '../transport/rpc.js';
import {TransportClient, TransportServer} from '../transport/transport.js';
import {assert, pipe} from '../utils.js';

export class HubClient<T> {
    private readonly server: HubServerRpc<T>;

    constructor(
        transportClient: TransportClient<Message>,
        schema: ZodType<T>,
        authSecret: string,
        hubUser: string
    ) {
        const conn = new PersistentConnection(transportClient);
        this.server = createRpcClient(
            createHubServerApi(schema),
            conn,
            () => ({
                auth: authSecret,
            }),
            hubUser
        );
    }

    // next waits for all subscribers to do their work
    async publish(topic: string, message: T) {
        await this.server.publish({topic, message});
    }

    async throw(topic: string, error: string) {
        await this.server.throw({topic, error});
    }

    async subscribe(topic: string): Promise<Cursor<T>> {
        const [init, updates] = this.server
            .subscribe({topic})
            .partition(x => x.type === 'init');
        await init.first();
        return updates.map(x => {
            assert(
                x.type === 'item' && 'item' in x,
                'expected item after partition'
            );
            return x.item as T;
        });
    }
}

export class HubServer<T> {
    private readonly rpcServer: RpcServer<HubServerRpcState<T>>;

    constructor(
        transport: TransportServer<Message>,
        schema: ZodType<T>,
        authSecret: string,
        serverName: string
    ) {
        this.rpcServer = new RpcServer(
            transport,
            createHubServerApi(schema),
            {
                authSecret,
                subjects: new SubjectManager(),
            },
            serverName
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

    async throw(topic: string, error: AppError) {
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

        return subject.stream().finally(() => {
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
    return pipe(
        createApi<HubServerRpcState<T>>()({
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
                        new AppError('EventHubServerApi.throw', {cause: error})
                    );
                },
            }),
            subscribe: streamer({
                req: z.object({topic: z.string()}),
                item: z.discriminatedUnion('type', [
                    z.object({type: z.literal('init')}),
                    z.object({type: z.literal('item'), item: zMessage}),
                ]),
                async *stream({subjects}, {topic}) {
                    const message$ = subjects.value$(topic).toCursor();
                    yield {type: 'init' as const};
                    yield* message$.map(item => ({
                        type: 'item' as const,
                        item,
                    }));
                },
            }),
        }),
        api =>
            applyMiddleware(
                api,
                async (next, state: HubServerRpcState<T>, {headers}) => {
                    if (headers.auth !== state.authSecret) {
                        throw new AppError(
                            `HubServer: authentication failed: ${state.authSecret} !== ${headers.auth}`
                        );
                    }

                    await next(state);
                }
            )
    );
}

type HubServerRpc<T> = InferRpcClient<ReturnType<typeof createHubServerApi<T>>>;
