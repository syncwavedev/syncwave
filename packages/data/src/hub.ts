import {z, ZodType} from 'zod';
import {AsyncStream, DeferredStream} from './async-stream.js';
import {Message} from './data/communication/message.js';
import {ReconnectConnection} from './data/communication/reconnect-connection.js';
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
} from './data/communication/rpc.js';
import {
    TransportClient,
    TransportServer,
} from './data/communication/transport.js';
import {Subject} from './utils.js';

export class HubClient<T> {
    private readonly client: HubServerRpc<T>;

    constructor(
        transportClient: TransportClient<Message>,
        schema: ZodType<T>,
        authSecret: string
    ) {
        const conn = new ReconnectConnection(transportClient);
        this.client = createRpcClient(createHubServerApi(schema), conn, () => ({
            auth: authSecret,
        }));
    }

    async publish(message: T) {
        await this.client.publish({message});
    }

    subscribe(): AsyncStream<T> {
        return this.client.subscribe({}) as AsyncStream<T>;
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
            subject: new Subject(),
        });
    }

    async launch(): Promise<void> {
        await this.rpcServer.launch();
    }

    async close() {
        await this.rpcServer.close();
    }
}

interface HubServerRpcState<T> {
    authSecret: string;
    subject: Subject<T>;
}

function createHubServerApi<T>(zMessage: ZodType<T>) {
    const api1 = createApi<HubServerRpcState<T>>()({
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
                return new DeferredStream(({next, end}) => {
                    state.subject.subscribe({
                        next: message => next({message: message as T}),
                        close: async () => end(),
                    });
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
