import {z, ZodType} from 'zod';
import {AsyncStream, DeferredStream} from '../../async-stream.js';
import {Subject} from '../../utils.js';
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

export class HubClient<T> {
    private readonly server: HubServerRpc<T>;

    constructor(
        transportClient: TransportClient<Message>,
        schema: ZodType<T>,
        authSecret: string
    ) {
        const conn = new ReconnectConnection(transportClient);
        this.server = createRpcClient(createHubServerApi(schema), conn, () => ({
            auth: authSecret,
        }));
    }

    // next waits for all subscribers to do their work
    async next(message: T) {
        await this.server.publish({message});
    }

    async throw(error: string) {
        await this.server.throw({error});
    }

    subscribe(): AsyncStream<T> {
        return this.server.subscribe({}) as AsyncStream<T>;
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
        throw: handler({
            req: z.object({error: z.string()}),
            res: z.void(),
            handle: async (state, {error}) => {
                await state.subject.throw(new Error(error));
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
