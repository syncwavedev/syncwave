import {DataAccessor} from '../actor.js';
import {Message} from '../communication/message.js';
import {PersistentConnection} from '../communication/persistent-connection.js';
import {setupRpcServerConnection} from '../communication/rpc.js';
import {Connection, TransportClient} from '../communication/transport.js';
import {CoordinatorClient} from '../coordinator/coordinator-client.js';
import {participantApi} from './participant-client.js';

// todo: add auto reconnect connection (it must buffer messages before sending them to an new connection)
export class Participant {
    private coordinator: CoordinatorClient;
    private readonly connection: Connection<Message>;

    constructor(
        transport: TransportClient<Message>,
        private readonly mode: 'proxy' | 'local'
    ) {
        this.connection = new PersistentConnection(transport);
        this.coordinator = new CoordinatorClient(this.connection);
        setupRpcServerConnection(participantApi, this.connection, {});
    }

    async sendSignInEmail(email: string) {
        return await this.coordinator.rpc.sendSignInEmail({email});
    }

    async verifySignInCode(email: string, code: string) {
        return await this.coordinator.rpc.verifySignInCode({email, code});
    }

    async debug() {
        return await this.coordinator.rpc.debug({});
    }

    authenticate(authToken: string): void {
        this.coordinator.authenticate(authToken);
    }

    public get data(): DataAccessor {
        return this.coordinator.rpc;
    }

    public get coordinatorRpc() {
        return this.coordinator.rpc;
    }

    async close(): Promise<void> {
        await this.connection.close();
    }
}
