import {z, ZodType} from 'zod';
import {astream, AsyncStream, StreamPuppet} from '../../async-stream.js';
import {CancelledError, Context} from '../../context.js';
import {Deferred} from '../../deferred.js';
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
    async publish(ctx: Context, topic: string, message: T) {
        await this.server.publish(ctx, {topic, message});
    }

    async throw(ctx: Context, topic: string, error: string) {
        await this.server.throw(ctx, {topic, error});
    }

    async subscribe(ctx: Context, topic: string): Promise<AsyncStream<T>> {
        const result = new Deferred<AsyncStream<T>>();
        const updateStream = new StreamPuppet<any>(ctx);
        (async () => {
            const observerStream = astream(
                this.server.subscribe(ctx, {topic}) as AsyncIterable<
                    {type: 'start'} | {type: 'message'; message: T}
                >
            );

            try {
                for await (const item of observerStream) {
                    if (item.type === 'start') {
                        result.resolve(astream(updateStream));
                    } else if (item.type === 'message') {
                        await updateStream.next(item.message);
                    } else {
                        assertNever(item);
                    }
                }
            } catch (error) {
                result.reject(error);
                await updateStream.throw(error);
            } finally {
                updateStream.end();
            }
        })()
            .catch(error => {
                console.error('[ERR] HubClient.subscribe', error);
                result.reject(error);
                return updateStream.throw(error);
            })
            .finally(() => {
                result.reject(new CancelledError());
                updateStream.end();
            });

        return result.promise;
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

        return subject.value$(ctx).finally(() => {
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
                await state.subjects.throw(ctx, topic, error);
            },
        }),
        subscribe: streamer({
            req: z.object({topic: z.string()}),
            item: z.discriminatedUnion('type', [
                z.object({type: z.literal('start')}),
                z.object({type: z.literal('message'), message: zMessage}),
            ]),
            async *stream(
                ctx,
                {subjects},
                {topic}
            ): AsyncIterable<
                | {type: 'start'}
                | {type: 'message'; message: z.infer<typeof zMessage>}
            > {
                const message$ = subjects.value$(ctx, topic);
                yield {type: 'start'};
                for await (const message of message$) {
                    yield {type: 'message', message};
                }
            },
        }),
    });

    const api2 = applyMiddleware(
        api1,
        async (ctx, next, state: HubServerRpcState<T>, headers) => {
            if (headers.auth !== state.authSecret) {
                throw new Error(
                    `HubServer: authentication failed: ${state.authSecret} !== ${headers.auth}`
                );
            }

            await next(ctx, state);
        }
    );

    return api2;
}

type HubServerRpc<T> = InferRpcClient<ReturnType<typeof createHubServerApi<T>>>;
