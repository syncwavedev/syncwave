import {context} from '../context.js';
import {
    type CoordinatorRpc,
    createCoordinatorApi,
} from '../coordinator/coordinator-api.js';
import {createReadApi} from '../data/read-api.js';
import {createWriteApi} from '../data/write-api/write-api.js';
import {tracerManager} from '../tracer-manager.js';
import type {Message} from '../transport/message.js';
import {PersistentConnection} from '../transport/persistent-connection.js';
import {
    createApi,
    createRpcClient,
    type InferRpcClient,
    type InferRpcClientWithRequiredHeaders,
    type MapProcessorState,
    type RequestInfo,
} from '../transport/rpc.js';
import type {Connection, TransportClient} from '../transport/transport.js';
import {assertNever} from '../utils.js';

export class ParticipantState {
    private readonly connection: Connection<Message>;

    public readonly coordinator: CoordinatorRpc;

    constructor(transport: TransportClient<Message>) {
        this.connection = new PersistentConnection(transport);
        this.coordinator = createRpcClient(
            createCoordinatorApi(),
            this.connection,
            () => ({
                ...context().extract(),
            }),
            'server',
            tracerManager.get('part')
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
                handle: (state: any, req: any, {headers}: RequestInfo) => {
                    return state.coordinator[name](req, headers);
                },
            } as any;
        } else if (processor.type === 'streamer') {
            return {
                type: 'streamer',
                req: processor.req,
                item: processor.item,
                stream: (state: any, req: any, {headers}: RequestInfo) => {
                    return state.coordinator[name](req, headers);
                },
            } as any;
        } else {
            assertNever(processor);
        }
    }

    return createApi<ParticipantState>()({
        getDbTree: proxy('getDbTree'),
        getDbItem: proxy('getDbItem'),
        truncateDb: proxy('truncateDb'),

        debug: proxy('debug'),
        echo: proxy('echo'),

        getMe: proxy('getMe'),
        sendSignInEmail: proxy('sendSignInEmail'),
        createBoard: proxy('createBoard'),
        verifySignInCode: proxy('verifySignInCode'),
        deleteDbItem: proxy('deleteDbItem'),
        getMyMembers: proxy('getMyMembers'),
        getBoard: proxy('getBoard'),
        createColumn: proxy('createColumn'),
        createTask: proxy('createTask'),
        getBoardView: proxy('getBoardView'),
        deleteBoard: proxy('deleteBoard'),
        deleteColumn: proxy('deleteColumn'),
        deleteTask: proxy('deleteTask'),
        createComment: proxy('createComment'),
        deleteComment: proxy('deleteComment'),
        getTaskComments: proxy('getTaskComments'),
        createMember: proxy('createMember'),
        deleteMember: proxy('deleteMember'),
        getBoardMembers: proxy('getBoardMembers'),

        applyUserDiff: proxy('applyUserDiff'),
        applyBoardDiff: proxy('applyBoardDiff'),
        applyColumnDiff: proxy('applyColumnDiff'),
        applyTaskDiff: proxy('applyTaskDiff'),
        applyMemberDiff: proxy('applyMemberDiff'),

        setUserAvatar: proxy('setUserAvatar'),
    });
}

export type ParticipantRpc = InferRpcClient<
    ReturnType<typeof createParticipantApi>
>;
