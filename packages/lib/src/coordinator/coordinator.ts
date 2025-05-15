import {AUTHENTICATOR_PRINCIPAL_CACHE_SIZE} from '../constants.js';
import {anonymous, Authenticator} from '../data/auth.js';
import {DataLayer} from '../data/data-layer.js';
import {
    ObjectKey,
    type CryptoProvider,
    type EmailProvider,
    type JwtProvider,
    type ObjectStore,
} from '../data/infrastructure.js';
import type {AttachmentId} from '../data/repos/attachment-repo.js';
import {BusinessError} from '../errors.js';
import type {KvStore} from '../kv/kv-store.js';
import type {Hub} from '../transport/hub.js';
import type {RpcMessage} from '../transport/rpc-message.js';
import {RpcServer} from '../transport/rpc.js';
import type {TransportServer} from '../transport/transport.js';
import type {Tuple} from '../tuple.js';
import {assert} from '../utils.js';
import {getAccount, signJwtToken} from './auth-api.js';
import {
    createCoordinatorApi,
    type CoordinatorApiState,
} from './coordinator-api.js';

export interface CoordinatorServerOptions {
    transport: TransportServer<RpcMessage>;
    kv: KvStore<Tuple, Uint8Array>;
    jwtProvider: JwtProvider;
    cryptoProvider: CryptoProvider;
    emailProvider: EmailProvider;
    objectStore: ObjectStore;
    hub: Hub;
    passwordsEnabled: boolean;
    superadminEmails: string[];
}

export class CoordinatorServer {
    private readonly dataLayer: DataLayer;
    private readonly rpcServer: RpcServer<CoordinatorApiState>;
    private readonly authenticator: Authenticator;

    constructor(private readonly options: CoordinatorServerOptions) {
        this.dataLayer = new DataLayer({
            kv: this.options.kv,
            hub: this.options.hub,
            crypto: this.options.cryptoProvider,
            email: options.emailProvider,
            passwordsEnabled: options.passwordsEnabled,
            superadminEmails: options.superadminEmails,
        });
        this.authenticator = new Authenticator(
            AUTHENTICATOR_PRINCIPAL_CACHE_SIZE,
            this.options.jwtProvider
        );

        this.rpcServer = new RpcServer(
            this.options.transport,
            createCoordinatorApi(),
            {
                dataLayer: this.dataLayer,
                jwtService: this.options.jwtProvider,
                crypto: this.options.cryptoProvider,
                emailProvider: this.options.emailProvider,
                hub: this.options.hub,
                objectStore: this.options.objectStore,
                close: reason => {
                    // todo: support async close
                    setTimeout(() => {
                        this.dataLayer.close(reason);
                        this.options.hub.close(reason);
                    }, 800); // give some time to finish pending requests
                },
            },
            this.authenticator
        );
    }

    async status() {
        try {
            await this.dataLayer.transact(anonymous, async tx => {
                const board = await tx.boards.rawRepo.scan().first();
                assert(board !== undefined, 'board not found');
            });

            return {status: 'ok' as const};
        } catch (error) {
            return {status: 'error' as const, error: (error as Error).message};
        }
    }

    async launch(): Promise<void> {
        await this.rpcServer.launch();
    }

    close(reason: unknown) {
        this.rpcServer.close(reason);
    }

    async issueJwtByUserEmail(params: {
        email: string;
        fullName: string;
    }): Promise<string> {
        return await this.dataLayer.transact(
            {accountId: undefined, superadmin: false, userId: undefined},
            async tx => {
                const account = await getAccount({
                    accounts: tx.accounts,
                    users: tx.users,
                    email: params.email,
                    crypto: this.options.cryptoProvider,
                    fullName: params.fullName,
                    boardService: tx.boardService,
                });

                return signJwtToken(this.options.jwtProvider, account);
            }
        );
    }

    async getAttachment(params: {attachmentId: AttachmentId; jwt: string}) {
        const principal = await this.authenticator.authenticate(params.jwt);
        const objectKey = await this.dataLayer.transact(principal, async tx => {
            const attachment = await tx.attachments.getById(
                params.attachmentId
            );
            if (attachment === undefined) {
                throw new BusinessError(
                    'Attachment not found',
                    'attachment_not_found'
                );
            }

            return attachment.objectKey;
        });

        return await this.options.objectStore.getStream(objectKey);
    }

    async getObjectStream(objectKey: ObjectKey) {
        return await this.options.objectStore.getStream(objectKey);
    }

    async getObject(objectKey: ObjectKey) {
        return await this.options.objectStore.get(objectKey);
    }

    async createObject(params: {
        jwt: string | undefined;
        stream: ReadableStream<Uint8Array>;
        contentType: string;
        objectKey: ObjectKey;
    }) {
        await this.authenticator.authenticate(params.jwt);

        await this.options.objectStore.putStream(
            params.objectKey,
            params.stream,
            {
                contentType: params.contentType,
            }
        );

        params.objectKey;
    }
}

export interface BaseVerifySignInCodeResponse<TType extends string> {
    readonly type: TType;
}

export interface SuccessVerifySignInCodeResponse
    extends BaseVerifySignInCodeResponse<'success'> {
    readonly token: string;
}

export interface InvalidCodeVerifySignInCodeResponse
    extends BaseVerifySignInCodeResponse<'invalid_code'> {}

export interface CodeExpiredVerifySignInCodeResponse
    extends BaseVerifySignInCodeResponse<'code_expired'> {}

export interface CooldownVerifySignInCodeResponse
    extends BaseVerifySignInCodeResponse<'cooldown'> {}

export type VerifySignInCodeResponse =
    | SuccessVerifySignInCodeResponse
    | InvalidCodeVerifySignInCodeResponse
    | CodeExpiredVerifySignInCodeResponse
    | CooldownVerifySignInCodeResponse;
