import {context} from '../context.js';
import {AppError} from '../errors.js';
import {RpcConnection} from '../transport/rpc-transport.js';
import {createRpcClient} from '../transport/rpc.js';
import type {Connection} from '../transport/transport.js';
import {createCoordinatorApi, type CoordinatorRpc} from './coordinator-api.js';

export class CoordinatorClientDummy {
    get rpc(): CoordinatorRpc {
        return new Proxy({} as any, {
            get: (_, name) => {
                throw new AppError(
                    'CoordinatorClientDummy get rpc field ' + String(name)
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

export class CoordinatorClient {
    private readonly connection: RpcConnection;
    public readonly rpc: CoordinatorRpc;

    constructor(
        connection: Connection<unknown>,
        private authToken: string | undefined
    ) {
        this.connection = new RpcConnection(connection);
        this.rpc = createRpcClient(
            createCoordinatorApi(),
            this.connection,
            () => ({
                ...context().extract(),
                auth: this.authToken,
            }),
            'coord'
        );
    }

    setAuthToken(token: string | undefined) {
        this.authToken = token;
    }

    close(reason: unknown): void {
        this.connection.close(reason);
    }
}
