import {z, ZodType} from 'zod';
import {DeferredStream} from '../../async-stream.js';
import {Subject, unimplemented} from '../../utils.js';
import {Message} from './message.js';
import {ReconnectConnection} from './reconnect-connection.js';
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

export class ChannelProducer<T> {
    private readonly consumer: ChannelConsumerRpc<T>;

    constructor(
        transportClient: TransportClient<Message>,
        schema: ZodType<T>,
        authSecret: string
    ) {
        const conn = new ReconnectConnection(transportClient);
        this.consumer = createRpcClient(
            createChannelConsumerApi(schema),
            conn,
            () => ({
                auth: authSecret,
            })
        );
    }

    // publish waits for all subscribers to do their work
    async next(message: T) {
        unimplemented();
    }

    async throw(error: string) {
        unimplemented();
    }

    async close(): Promise<void> {
        unimplemented();
    }
}

export class ChannelConsumer<T> {
    private readonly rpcServer: RpcServer<ChannelConsumerRpcState<T>>;

    constructor(
        transport: TransportServer<Message>,
        schema: ZodType<T>,
        authSecret: string
    ) {
        this.rpcServer = new RpcServer(
            transport,
            createChannelConsumerApi(schema),
            {
                authSecret,
                subject: new Subject(),
            }
        );
    }

    async launch(): Promise<void> {
        await this.rpcServer.launch();
    }

    async close() {
        await this.rpcServer.close();
    }
}

interface ChannelConsumerRpcState<T> {
    authSecret: string;
    subject: Subject<T>;
}

function createChannelConsumerApi<T>(zMessage: ZodType<T>) {
    const api1 = createApi<ChannelConsumerRpcState<T>>()({
        publish: handler({
            req: z.object({
                message: zMessage,
            }),
            res: z.void(),
            handle: async (state, {message}) => {
                await state.subject.next(message as T);
            },
        }),
        subscribe: streamer({
            req: z.object({}),
            item: z.object({message: zMessage}),
            stream(state) {
                return new DeferredStream(exe => {
                    state.subject.subscribe({
                        next: message => exe.next({message: message as T}),
                        throw: error => exe.throw(error),
                        close: async () => exe.end(),
                    });
                });
            },
        }),
    });

    const api2 = mapApiState(
        api1,
        ({state}: ProcessorContext<ChannelConsumerRpcState<T>>) => state
    );

    const api3 = applyMiddleware(
        api2,
        async (next, state: ProcessorContext<ChannelConsumerRpcState<T>>) => {
            if (state.message.headers?.auth !== state.state.authSecret) {
                throw new Error('ChannelConsumer: authentication failed');
            }

            await next(state);
        }
    );

    return api3;
}

type ChannelConsumerRpc<T> = InferRpcClient<
    ReturnType<typeof createChannelConsumerApi<T>>
>;
