import type {Tracer} from '@opentelemetry/api';
import {Type} from '@sinclair/typebox';
import {context} from '../context.js';
import {Cursor} from '../cursor.js';
import {AppError} from '../errors.js';
import {log} from '../logger.js';
import {type Observer, Subject} from '../subject.js';
import {tracerManager} from '../tracer-manager.js';
import {PersistentConnection} from '../transport/persistent-connection.js';
import {type RpcMessage} from '../transport/rpc-message.js';
import {
    applyMiddleware,
    createApi,
    createRpcClient,
    handler,
    type InferRpcClient,
    RpcServer,
    streamer,
} from '../transport/rpc.js';
import type {TransportClient, TransportServer} from '../transport/transport.js';
import {type InferSchema, pipe, runAll} from '../utils.js';

export class HubClient<T> {
    private readonly server: HubServerRpc<T>;

    constructor(
        transportClient: TransportClient<unknown>,
        schema: InferSchema<T>,
        authSecret: string,
        hubUser: string,
        tracer: Tracer
    ) {
        const conn = new PersistentConnection(transportClient);
        this.server = createRpcClient(
            createHubServerApi(schema),
            conn,
            () => ({
                auth: authSecret,
                ...context().extract(),
            }),
            hubUser,
            tracer
        );
    }

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
        return updates.map(x => x.item);
    }

    close(reason: unknown) {
        this.server.close(reason);
    }
}

export class HubServer<T> {
    private readonly rpcServer: RpcServer<HubServerRpcState<T>>;

    constructor(
        transport: TransportServer<RpcMessage>,
        schema: InferSchema<T>,
        authSecret: string,
        serverName: string
    ) {
        this.rpcServer = new RpcServer(
            transport,
            createHubServerApi(schema),
            new HubServerRpcState<T>(authSecret, new SubjectManager()),
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

class HubServerRpcState<T> {
    constructor(
        readonly authSecret: string,
        readonly subjects: SubjectManager<T>
    ) {}
    close(reason: unknown): void {
        this.subjects.closeAll(reason);
    }
}

function createHubServerApi<T>(zMessage: InferSchema<T>) {
    return pipe(
        createApi<HubServerRpcState<T>>()({
            publish: handler({
                req: Type.Object({
                    topic: Type.String(),
                    message: zMessage,
                }),
                res: Type.Void(),
                handle: async (state, {topic, message}) => {
                    state.subjects.next(topic, message!).catch(error => {
                        log.error(error, 'HubServer.publish');
                    });
                },
            }),
            throw: handler({
                req: Type.Object({topic: Type.String(), error: Type.String()}),
                res: Type.Void(),
                handle: async (state, {topic, error}) => {
                    await state.subjects.throw(
                        topic,
                        new AppError('EventHubServerApi.throw', {cause: error})
                    );
                },
            }),
            subscribe: streamer({
                req: Type.Object({topic: Type.String()}),
                item: Type.Union([
                    Type.Object({type: Type.Literal('init')}),
                    Type.Object({type: Type.Literal('item'), item: zMessage}),
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
