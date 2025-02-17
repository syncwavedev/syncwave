import {trace} from '@opentelemetry/api';
import {beforeEach, describe, expect, it} from 'vitest';
import {
    assert,
    CoordinatorServer,
    type CryptoService,
    drop,
    type EmailMessage,
    type EmailService,
    type JwtService,
    log,
    MemKVStore,
    type Message,
    MsgpackCodec,
    ParticipantClient,
    ParticipantServer,
} from '../src/index.js';
import {
    MemTransportClient,
    MemTransportServer,
} from '../src/transport/mem-transport.js';

describe('e2e', () => {
    let client: ParticipantClient;
    let outbox: EmailMessage[];

    beforeEach(async () => {
        log.setLogLevel('error');
        const coordinatorTransportServer = new MemTransportServer<Message>(
            new MsgpackCodec()
        );
        const coordinatorKv = new MemKVStore();
        const jwt: JwtService = {
            sign: async payload => JSON.stringify(payload),
            verify: token => JSON.parse(token),
        };
        const crypto: CryptoService = {
            randomBytes: async () => new Uint8Array(0),
            sha256: text => text,
        };
        outbox = [];
        const email: EmailService = {
            send: async message => {
                outbox.push(message);
            },
        };
        const jwtSecret = 'secret';
        const coordinator = new CoordinatorServer(
            coordinatorTransportServer,
            coordinatorKv,
            jwt,
            crypto,
            email,
            jwtSecret
        );

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
        client = new ParticipantClient(
            clientTransportClient,
            undefined,
            trace.getTracer('e2e')
        );
    });

    it('should echo message back', async () => {
        const result = await client.rpc.echo({msg: 'hello'});

        expect(result).toEqual({msg: 'hello'});
    });

    it('should sign in', async () => {
        await client.rpc.sendSignInEmail({email: 'test@test.com'});
        expect(outbox.length).toBe(1);
        expect(outbox[0].recipient).toBe('test@test.com');
        const code = outbox[0].text
            .split('\n')
            .find(x => x.includes('Your one-time code is'))
            ?.split(': ')[1];
        const token = await client.rpc.verifySignInCode({
            email: 'test@test.com',
            code: code!,
        });

        assert(token.type === 'success', 'token expected');

        client.setAuthToken(token.token);

        const result = await client.rpc.getMe({}).first();

        expect(result.user.fullName).toEqual('Anonymous');
    });
});
