import {trace} from '@opentelemetry/api';
import {MsgpackCodec} from '../src/codec.js';
import {
    CoordinatorServer,
    MemMvccStore,
    MemObjectStore,
    MemTransportClient,
    MemTransportServer,
    ParticipantClient,
    ParticipantServer,
    TupleStore,
    type CryptoService,
    type EmailMessage,
    type EmailService,
    type JwtService,
    type RpcMessage,
} from '../src/index.js';
import {log} from '../src/logger.js';
import {assert, drop} from '../src/utils.js';

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
            clientTransportClient,
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

    close(reason: unknown) {
        this.client.close(reason);
    }
}
