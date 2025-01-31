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

    constructor(transport: TransportClient<Message>) {
        this.connection = new PersistentConnection(transport);
        this.coordinator = createRpcClient(
            createCoordinatorApi(),
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

    close(): void {
        this.connection.close();
    }
}

export function createParticipantApi() {
    const coordinatorApi = createCoordinatorApi();

    function proxy<K extends keyof typeof coordinatorApi>(
        name: K
    ): MapProcessorState<(typeof coordinatorApi)[K], ParticipantState> {
        const processor = coordinatorApi[name];
        if (processor.type === 'handler') {
            return {
                type: 'handler',
                req: processor.req,
                res: processor.res,
                handle: async (
                    state: any,
                    req: any,
                    headers: MessageHeaders
                ) => {
                    return await state.coordinator[name](req, headers);
                },
            } as any;
        } else if (processor.type === 'streamer') {
            if (processor.observer) {
                return {
                    type: 'streamer',
                    req: processor.req,
                    item: processor.item,
                    observer: processor.observer,
                    stream: (state: any, req: any, headers: MessageHeaders) => {
                        return state.coordinator[name](req, headers);
                    },
                } as any;
            } else {
                return {
                    type: 'streamer',
                    req: processor.req,
                    item: processor.item,
                    observer: processor.observer,
                    stream: (state: any, req: any, headers: MessageHeaders) => {
                        return state.coordinator[name](req, headers);
                    },
                } as any;
            }
        } else {
            assertNever(processor);
        }
    }

    return createApi<ParticipantState>()({
        streamPut: proxy('streamPut'),
        getStream: proxy('getStream'),
        debug: proxy('debug'),
        sendSignInEmail: proxy('sendSignInEmail'),
        createBoard: proxy('createBoard'),
        verifySignInCode: proxy('verifySignInCode'),
        getDbTree: proxy('getDbTree'),
        getDbItem: proxy('getDbItem'),
        truncateDb: proxy('truncateDb'),
        getMyBoards: proxy('getMyBoards'),
    });
}

export type ParticipantRpc = InferRpcClient<
    ReturnType<typeof createParticipantApi>
>;
