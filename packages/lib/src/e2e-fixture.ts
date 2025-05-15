import {MsgpackCodec} from './codec.js';
import {CoordinatorClient} from './coordinator/coordinator-client.js';
import {MemEmailProvider} from './data/mem-email-provider.js';
import {
    CoordinatorServer,
    MemHub,
    MemMvccStore,
    MemObjectStore,
    MemTransportClient,
    MemTransportServer,
    TupleStore,
    type CryptoProvider,
    type JwtProvider,
    type RpcMessage,
    type TransportClient,
} from './index.js';
import {log} from './logger.js';
import {assert, drop} from './utils.js';

export class E2eFixture {
    static async start(options: {
        jwtProvider: JwtProvider;
        cryptoService: CryptoProvider;
    }) {
        log.setLogLevel('error');
        const coordinatorTransportServer = new MemTransportServer<RpcMessage>(
            new MsgpackCodec()
        );
        const coordinatorKv = new MemMvccStore();
        const emailProvider = new MemEmailProvider();
        const coordinator = new CoordinatorServer({
            transport: coordinatorTransportServer,
            kv: new TupleStore(coordinatorKv),
            jwtProvider: options.jwtProvider,
            cryptoProvider: options.cryptoService,
            emailProvider,
            objectStore: new MemObjectStore(),
            hub: new MemHub(),
            passwordsEnabled: true,
            superadminEmails: [],
        });

        drop(coordinator.launch());

        const coordinatorTransportClient = new MemTransportClient(
            coordinatorTransportServer,
            new MsgpackCodec()
        );

        const client = new CoordinatorClient(
            await coordinatorTransportClient.connect(),
            undefined
        );

        return new E2eFixture(
            client,
            coordinatorTransportClient,
            emailProvider
        );
    }

    constructor(
        public readonly client: CoordinatorClient,
        public readonly transportClient: TransportClient<unknown>,
        public readonly emailProvider: MemEmailProvider
    ) {}

    async signIn() {
        await this.client.rpc.sendSignInEmail({
            email: 'test@test.com',
            uiUrl: 'http://localhost:3000',
        });
        const message = this.emailProvider.outbox.at(-1);
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
