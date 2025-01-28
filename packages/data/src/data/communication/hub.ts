import {z, ZodType} from 'zod';
import {AsyncStream} from '../../async-stream.js';
import {Context} from '../../context.js';
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
    async publish(ctx: Context, topic: string, message: T) {
        await this.server.publish(ctx, {topic, message});
    }

    async throw(ctx: Context, topic: string, error: string) {
        await this.server.throw(ctx, {topic, error});
    }

    subscribe(ctx: Context, topic: string): AsyncStream<T> {
        return this.server.subscribe(ctx, {topic}).map((ctx, x) => x.message!);
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

    async next(ctx: Context, topic: string, value: T) {
        await this.subjects.get(topic)?.next(ctx, value);
    }

    async throw(ctx: Context, topic: string, error: unknown) {
        await this.subjects.get(topic)?.throw(ctx, error);
    }

    subscribe(ctx: Context, topic: string, observer: Observer<T>) {
        let subject = this.subjects.get(topic);
        if (!subject) {
            subject = new Subject();
            this.subjects.set(topic, subject);
        }
        subject.subscribe(ctx, {
            next: (ctx, value) => observer.next(ctx, value),
            throw: (ctx, error) => observer.throw(ctx, error),
            close: async ctx => {
                await observer.close(ctx);
                if (!subject.anyObservers) {
                    this.subjects.delete(topic);
                }
            },
        });
    }

    value$(ctx: Context, topic: string) {
        let subject = this.subjects.get(topic);
        if (!subject) {
            subject = new Subject();
            this.subjects.set(topic, subject);
        }

        return subject.value$(ctx).finally(async () => {
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
            handle: async (ctx, state, {topic, message}) => {
                await state.subjects.next(ctx, topic, message!);
            },
        }),
        throw: handler({
            req: z.object({topic: z.string(), error: z.string()}),
            res: z.void(),
            handle: async (ctx, state, {topic, error}) => {
                await state.subjects.throw(ctx, topic, new Error(error));
            },
        }),
        subscribe: streamer({
            req: z.object({topic: z.string()}),
            item: z.object({message: zMessage}),
            async *stream(ctx, {subjects}, {topic}) {
                for await (const message of subjects.value$(ctx, topic)) {
                    yield {message};
                }
            },
        }),
    });

    const api2 = mapApiState(
        api1,
        (ctx, {state}: ProcessorContext<HubServerRpcState<T>>) => state
    );

    const api3 = applyMiddleware(
        api2,
        async (ctx, next, state: ProcessorContext<HubServerRpcState<T>>) => {
            if (state.message.headers?.auth !== state.state.authSecret) {
                throw new Error(
                    `HubServer: authentication failed: ${state.state.authSecret} !== ${state.message.headers?.auth}`
                );
            }

            await next(ctx, state);
        }
    );

    return api3;
}

type HubServerRpc<T> = InferRpcClient<ReturnType<typeof createHubServerApi<T>>>;
