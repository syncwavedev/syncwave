import type {Tracer} from '@opentelemetry/api';
import {context} from '../context.js';
import {AppError} from '../errors.js';
import {RpcConnection} from '../transport/rpc-transport.js';
import {createRpcClient} from '../transport/rpc.js';
import type {Connection} from '../transport/transport.js';
import {createParticipantApi, type ParticipantRpc} from './participant-api.js';

export class ParticipantClientDummy {
    get rpc(): ParticipantRpc {
        return new Proxy({} as any, {
            get: (_, name) => {
                throw new AppError(
                    'ParticipantClientDummy get rpc field ' + String(name)
                );
            },
        });
    }
    setAuthToken(token: string | undefined): void {
        // do nothing
    }
    close(reason: unknown): void {
        // do nothing
    }
}

export class ParticipantClient {
    private readonly connection: RpcConnection;
    public readonly rpc: ParticipantRpc;

    constructor(
        connection: Connection<unknown>,
        private authToken: string | undefined,
        tracer: Tracer
    ) {
        this.connection = new RpcConnection(connection);
        this.rpc = createRpcClient(
            createParticipantApi(),
            this.connection,
            () => ({
                ...context().extract(),
                auth: this.authToken,
            }),
            'part',
            tracer
        );
    }

    setAuthToken(token: string | undefined) {
        this.authToken = token;
    }

    close(reason: unknown): void {
        this.connection.close(reason);
    }
}
