import type {Tracer} from '@opentelemetry/api';
import {Type} from '@sinclair/typebox';
import {context} from '../context.js';
import {Cursor} from '../cursor.js';
import {AppError} from '../errors.js';
import {log} from '../logger.js';
import {type Observer, Subject} from '../subject.js';
import {tracerManager} from '../tracer-manager.js';
import {pipe, runAll} from '../utils.js';
import type {Hub} from './hub.js';
import {PersistentConnection} from './persistent-connection.js';
import {type RpcMessage} from './rpc-message.js';
import {
    applyMiddleware,
    createApi,
    createRpcClient,
    handler,
    type InferRpcClient,
    RpcServer,
    streamer,
} from './rpc.js';
import type {TransportClient, TransportServer} from './transport.js';

export class RpcHubClient implements Hub {
    private readonly server: RpcHubServerRpc;

    constructor(
        transportClient: TransportClient<unknown>,
        authSecret: string,
        hubUser: string,
        tracer: Tracer
    ) {
        const conn = new PersistentConnection(transportClient);
        this.server = createRpcClient(
            createRpcHubServerApi(),
            conn,
            () => ({
                auth: authSecret,
                ...context().extract(),
            }),
            hubUser,
            tracer
        );
    }

    async emit(topic: string) {
        await this.server.emit({topic});
    }

    async subscribe(topic: string): Promise<Cursor<void>> {
        const [init, updates] = this.server
            .subscribe({topic})
            .partition(x => x.type === 'init');
        await init.first();
        return updates.map(() => {});
    }

    close(reason: unknown) {
        this.server.close(reason);
    }
}

export class RpcHubServer {
    private readonly rpcServer: RpcServer<RpcHubServerRpcState>;

    constructor(
        transport: TransportServer<RpcMessage>,
        authSecret: string,
        serverName: string
    ) {
        this.rpcServer = new RpcServer(
            transport,
            createRpcHubServerApi(),
            new RpcHubServerRpcState(authSecret, new SubjectManager()),
            serverName,
            tracerManager.get('hub')
        );
    }

    async launch(): Promise<void> {
        await this.rpcServer.launch();
    }

    close(reason: unknown) {
        this.rpcServer.close(reason);
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
            close: reason => {
                observer.close(
                    new AppError('HubServer: subject closed', {cause: reason})
                );
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

    closeAll(reason: unknown) {
        runAll([...this.subjects.values()].map(x => () => x.close(reason)));
    }
}

class RpcHubServerRpcState {
    constructor(
        readonly authSecret: string,
        readonly subjects: SubjectManager<void>
    ) {}
    close(reason: unknown): void {
        this.subjects.closeAll(reason);
    }
}

function createRpcHubServerApi() {
    return pipe(
        createApi<RpcHubServerRpcState>()({
            emit: handler({
                req: Type.Object({
                    topic: Type.String(),
                }),
                res: Type.Object({}),
                handle: async (state, {topic}) => {
                    state.subjects.next(topic).catch(error => {
                        log.error(error, 'HubServer.emit');
                    });
                    return {};
                },
            }),
            subscribe: streamer({
                req: Type.Object({topic: Type.String()}),
                item: Type.Union([
                    Type.Object({type: Type.Literal('init')}),
                    Type.Object({type: Type.Literal('event')}),
                ]),
                async *stream({subjects}, {topic}) {
                    const message$ = subjects.value$(topic).toCursor();
                    yield {type: 'init' as const};
                    yield* message$.map(() => ({type: 'event' as const}));
                },
            }),
        }),
        api =>
            applyMiddleware(
                api,
                async (next, state: RpcHubServerRpcState, {headers}) => {
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

type RpcHubServerRpc = InferRpcClient<ReturnType<typeof createRpcHubServerApi>>;
