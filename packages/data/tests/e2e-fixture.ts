import {trace} from '@opentelemetry/api';
import {MsgpackCodec} from '../src/codec.js';
import {
    CoordinatorServer,
    Crdt,
    createBoardId,
    createCardId,
    createColumnId,
    createRichtext,
    MemMvccStore,
    MemObjectStore,
    MemTransportClient,
    MemTransportServer,
    ParticipantClient,
    ParticipantServer,
    toPosition,
    toTimestamp,
    TupleStore,
    type BoardId,
    type Card,
    type CryptoService,
    type EmailMessage,
    type EmailService,
    type JwtService,
    type RpcMessage,
} from '../src/index.js';
import {log} from '../src/logger.js';
import {assert, assertSingle, drop} from '../src/utils.js';

export class E2eFixture {
    static async start() {
        log.setLogLevel('error');
        const coordinatorTransportServer = new MemTransportServer<RpcMessage>(
            new MsgpackCodec()
        );
        const coordinatorKv = new MemMvccStore();
        const jwt: JwtService = {
            sign: async payload => JSON.stringify(payload),
            verify: token => JSON.parse(token),
        };
        const crypto: CryptoService = {
            randomBytes: async () => new Uint8Array(0),
            sha256: text => text,
        };
        const outbox: EmailMessage[] = [];
        const email: EmailService = {
            send: async message => {
                outbox.push(message);
            },
        };
        const jwtSecret = 'secret';
        const coordinator = new CoordinatorServer({
            transport: coordinatorTransportServer,
            kv: new TupleStore(coordinatorKv),
            jwt,
            crypto,
            email,
            jwtSecret,
            objectStore: new MemObjectStore(),
        });

        drop(coordinator.launch());

        const participantTransportClient = new MemTransportClient(
            coordinatorTransportServer,
            new MsgpackCodec()
        );
        const participantTransportServer = new MemTransportServer(
            new MsgpackCodec()
        );
        const participant = new ParticipantServer({
            client: participantTransportClient,
            server: participantTransportServer,
        });

        drop(participant.launch());

        const clientTransportClient = new MemTransportClient(
            participantTransportServer,
            new MsgpackCodec()
        );
        const client = new ParticipantClient(
            await clientTransportClient.connect(),
            undefined,
            trace.getTracer('e2e')
        );

        return new E2eFixture(client, outbox);
    }

    constructor(
        public readonly client: ParticipantClient,
        public readonly outbox: readonly EmailMessage[]
    ) {}

    async signIn() {
        await this.client.rpc.sendSignInEmail({email: 'test@test.com'});
        const message = this.outbox.at(-1);
        assert(message !== undefined, 'message expected');
        const code = message.text
            .split('\n')
            .find(x => x.includes('Your one-time code is'))
            ?.split(': ')[1];
        const token = await this.client.rpc.verifySignInCode({
            email: 'test@test.com',
            code: code!,
        });

        assert(token.type === 'success', 'token expected');

        this.client.setAuthToken(token.token);
    }

    async createCard(targetBoardId?: BoardId) {
        await this.signIn();

        let boardId: BoardId;
        if (targetBoardId === undefined) {
            boardId = createBoardId();
            await this.client.rpc.createBoard({
                boardId,
                name: 'Test board',
                key: 'TEST',
                members: [],
            });
        } else {
            boardId = targetBoardId;
        }

        const me = await this.client.rpc.getMe({}).first();

        const columnId = createColumnId();
        await this.client.rpc.createColumn({
            boardId,
            boardPosition: toPosition({next: undefined, prev: undefined}),
            columnId,
            name: 'Test column',
        });

        const now = new Date();
        const cardId = createCardId();
        const cardCrdt = Crdt.from<Card>({
            authorId: me.user.id,
            boardId,
            columnId,
            createdAt: toTimestamp(now),
            deleted: false,
            id: cardId,
            columnPosition: toPosition({next: undefined, prev: undefined}),
            counter: 0,
            pk: [cardId],
            updatedAt: toTimestamp(now),
            text: createRichtext(),
        });

        await this.client.rpc.applyCardDiff({
            cardId,
            diff: cardCrdt.state(),
        });

        const overview = await this.client.rpc
            .getBoardViewData({key: 'TEST'})
            .filter(x => x.type === 'snapshot')
            .map(x => x.data)
            .first();

        const card = assertSingle(
            overview.cards.filter(x => x.id === cardId),
            'expected single card'
        );

        return Crdt.load(card.state).snapshot();
    }

    close(reason: unknown) {
        this.client.close(reason);
    }
}
