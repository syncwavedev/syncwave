import {z, ZodType} from 'zod';
import {astream, AsyncStream, StreamPuppet} from '../../async-stream.js';
import {CancelledError, Cx} from '../../context.js';
import {Deferred} from '../../deferred.js';
import {AppError, toError} from '../../errors.js';
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
        cx: Cx,
        transportClient: TransportClient<Message>,
        schema: ZodType<T>,
        authSecret: string
    ) {
        const conn = new PersistentConnection(transportClient);
        this.server = createRpcClient(
            createHubServerApi(cx, schema),
            conn,
            () => ({
                auth: authSecret,
            })
        );
    }

    // next waits for all subscribers to do their work
    async publish(cx: Cx, topic: string, message: T) {
        await this.server.publish(cx, {topic, message});
    }

    async throw(cx: Cx, topic: string, error: string) {
        await this.server.throw(cx, {topic, error});
    }

    async subscribe(cx: Cx, topic: string): Promise<AsyncStream<T>> {
        const result = new Deferred<AsyncStream<T>>();
        const updateStream = new StreamPuppet<any>(cx);
        (async () => {
            const observerStream = astream(
                this.server.subscribe(cx, {topic}) as AsyncIterable<
                    {type: 'start'} | {type: 'message'; message: T}
                >
            );

            try {
                for await (const item of observerStream) {
                    if (item.type === 'start') {
                        result.resolve(cx, astream(updateStream));
                    } else if (item.type === 'message') {
                        await updateStream.next(cx, item.message);
                    } else {
                        assertNever(cx, item);
                    }
                }
            } catch (error) {
                result.reject(cx, toError(cx, error));
                await updateStream.throw(cx, error);
            } finally {
                updateStream.end();
            }
        })()
            .catch((error: unknown) => {
                logger.error(cx, 'HubClient.subscribe', error);
                result.reject(cx, toError(cx, error));
                return updateStream.throw(cx, error);
            })
            .finally(() => {
                result.reject(cx, new CancelledError(cx));
                updateStream.end();
            });

        return result.promise;
    }
}

export class HubServer<T> {
    private readonly rpcServer: RpcServer<HubServerRpcState<T>>;

    constructor(
        cx: Cx,
        transport: TransportServer<Message>,
        schema: ZodType<T>,
        authSecret: string
    ) {
        this.rpcServer = new RpcServer(
            transport,
            createHubServerApi(cx, schema),
            {
                authSecret,
                subjects: new SubjectManager(),
            },
            'HUB'
        );
    }

    async launch(cx: Cx): Promise<void> {
        await this.rpcServer.launch(cx);
    }

    async close(cx: Cx) {
        await this.rpcServer.close(cx);
    }
}

class SubjectManager<T> {
    private subjects = new Map<string, Subject<T>>();

    async next(cx: Cx, topic: string, value: T) {
        await this.subjects.get(topic)?.next(cx, value);
    }

    async throw(cx: Cx, topic: string, error: AppError) {
        await this.subjects.get(topic)?.throw(cx, error);
    }

    subscribe(cx: Cx, topic: string, observer: Observer<T>) {
        let subject = this.subjects.get(topic);
        if (!subject) {
            subject = new Subject();
            this.subjects.set(topic, subject);
        }
        subject.subscribe(cx, {
            next: (cx, value) => observer.next(cx, value),
            throw: (cx, error) => observer.throw(cx, error),
            close: async cx => {
                await observer.close(cx);
                if (!subject.anyObservers) {
                    this.subjects.delete(topic);
                }
            },
        });
    }

    value$(cx: Cx, topic: string) {
        let subject = this.subjects.get(topic);
        if (!subject) {
            subject = new Subject();
            this.subjects.set(topic, subject);
        }

        return subject.value$(cx).finally(() => {
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

function createHubServerApi<T>(cx: Cx, zMessage: ZodType<T>) {
    const api1 = createApi<HubServerRpcState<T>>()({
        publish: handler({
            req: z.object({
                topic: z.string(),
                message: zMessage,
            }),
            res: z.void(),
            handle: async (cx, state, {topic, message}) => {
                await state.subjects.next(cx, topic, message!);
            },
        }),
        throw: handler({
            req: z.object({topic: z.string(), error: z.string()}),
            res: z.void(),
            handle: async (cx, state, {topic, error}) => {
                await state.subjects.throw(
                    cx,
                    topic,
                    new AppError(cx, 'EventHubServerApi.throw', {cause: error})
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
                cx,
                {subjects},
                {topic}
            ): AsyncIterable<
                | {type: 'start'}
                | {type: 'message'; message: z.infer<typeof zMessage>}
            > {
                const message$ = subjects.value$(cx, topic);
                yield {type: 'start'};
                for await (const message of message$) {
                    yield {type: 'message', message};
                }
            },
        }),
    });

    const api2 = applyMiddleware(
        cx,
        api1,
        async (cx, next, state: HubServerRpcState<T>, headers) => {
            if (headers.auth !== state.authSecret) {
                throw new AppError(
                    cx,
                    `HubServer: authentication failed: ${state.authSecret} !== ${headers.auth}`
                );
            }

            await next(cx, state);
        }
    );

    return api2;
}

type HubServerRpc<T> = InferRpcClient<ReturnType<typeof createHubServerApi<T>>>;
