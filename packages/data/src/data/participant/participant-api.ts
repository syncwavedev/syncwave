import {Cx} from '../../context.js';
import {assertNever} from '../../utils.js';
import {Message, MessageHeaders} from '../communication/message.js';
import {PersistentConnection} from '../communication/persistent-connection.js';
import {Connection, TransportClient} from '../communication/transport.js';
import {
    CoordinatorRpc,
    createCoordinatorApi,
} from '../coordinator/coordinator-api.js';
import {createReadApi} from '../data-api/read-api.js';
import {createWriteApi} from '../data-api/write-api.js';
import {createRpcClient} from '../rpc/rpc-engine.js';
import {
    createApi,
    InferRpcClient,
    InferRpcClientWithRequiredHeaders,
    MapProcessorState,
} from '../rpc/rpc.js';

export class ParticipantState {
    private readonly connection: Connection<Message>;

    public readonly coordinator: CoordinatorRpc;

    constructor(cx: Cx, transport: TransportClient<Message>) {
        this.connection = new PersistentConnection(transport);
        this.coordinator = createRpcClient(
            createCoordinatorApi(cx),
            this.connection,
            () => ({})
        );
    }

    public get read(): InferRpcClientWithRequiredHeaders<
        ReturnType<typeof createReadApi>
    > {
        return this.coordinator;
    }

    public get write(): InferRpcClientWithRequiredHeaders<
        ReturnType<typeof createWriteApi>
    > {
        return this.coordinator;
    }

    async close(): Promise<void> {
        await this.connection.close(Cx.todo());
    }
}

export function createParticipantApi(cx: Cx) {
    const coordinatorApi = createCoordinatorApi(cx);

    function proxy<K extends keyof typeof coordinatorApi>(
        cx: Cx,
        name: K
    ): MapProcessorState<(typeof coordinatorApi)[K], ParticipantState> {
        const processor = coordinatorApi[name];
        if (processor.type === 'handler') {
            return {
                type: 'handler',
                req: processor.req,
                res: processor.res,
                handle: async (
                    cx: Cx,
                    state: any,
                    req: any,
                    headers: MessageHeaders
                ) => {
                    return await state.coordinator[name](cx, req, headers);
                },
            } as any;
        } else if (processor.type === 'streamer') {
            if (processor.observer) {
                return {
                    type: 'streamer',
                    req: processor.req,
                    item: processor.item,
                    observer: processor.observer,
                    stream: (
                        cx: Cx,
                        state: any,
                        req: any,
                        headers: MessageHeaders
                    ) => {
                        return state.coordinator[name](cx, req, headers);
                    },
                } as any;
            } else {
                return {
                    type: 'streamer',
                    req: processor.req,
                    item: processor.item,
                    observer: processor.observer,
                    stream: (
                        cx: Cx,
                        state: any,
                        req: any,
                        headers: MessageHeaders
                    ) => {
                        return state.coordinator[name](cx, req, headers);
                    },
                } as any;
            }
        } else {
            assertNever(cx, processor);
        }
    }

    return createApi<ParticipantState>()({
        streamPut: proxy(cx, 'streamPut'),
        getStream: proxy(cx, 'getStream'),
        debug: proxy(cx, 'debug'),
        sendSignInEmail: proxy(cx, 'sendSignInEmail'),
        createBoard: proxy(cx, 'createBoard'),
        verifySignInCode: proxy(cx, 'verifySignInCode'),
        getDbTree: proxy(cx, 'getDbTree'),
        getDbItem: proxy(cx, 'getDbItem'),
        truncateDb: proxy(cx, 'truncateDb'),
        getMyBoards: proxy(cx, 'getMyBoards'),
    });
}

export type ParticipantRpc = InferRpcClient<
    ReturnType<typeof createParticipantApi>
>;
