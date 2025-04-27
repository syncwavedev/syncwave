import {ReturnType} from '@sinclair/typebox';
import {beforeEach, describe, expect, it} from 'vitest';
import {anonymous} from '../data/auth.js';
import {DataLayer} from '../data/data-layer.js';
import {MemEmailProvider} from '../data/mem-email-provider.js';
import {MemMvccStore} from '../kv/mem-mvcc-store.js';
import {TupleStore} from '../kv/tuple-store.js';
import {NodeCryptoProvider} from '../node-crypto-provider.js';
import {MemHub} from '../transport/hub.js';
import type {RpcMessageId} from '../transport/rpc-message.js';
import {createUuidV4} from '../uuid.js';
import {createAuthApi, getAccount} from './auth-api.js';

describe('AccountRepo', () => {
    let data: DataLayer;
    let authApi: ReturnType<typeof createAuthApi>;

    beforeEach(() => {
        data = new DataLayer({
            kv: new TupleStore(new MemMvccStore()),
            hub: new MemHub(),
            crypto: NodeCryptoProvider,
            email: new MemEmailProvider(),
            uiUrl: 'https://example.com/',
            passwordsEnabled: true,
        });

        authApi = createAuthApi();
    });

    it('should create account', async () => {
        await data.transact(anonymous, async tx => {
            const account = await getAccount({
                accounts: tx.accounts,
                boardService: tx.boardService,
                email: 'test@email.com',
                fullName: 'Test User',
                users: tx.users,
                crypto: NodeCryptoProvider,
            });

            expect(account.email).toEqual('test@email.com');

            const members = await tx.members
                .getByUserId(account.userId, {excludeDeleted: true})
                .toArray();

            expect(members).toHaveLength(1);
            expect(members[0].userId).toEqual(account.userId);

            const board = await tx.boards.getById(members[0].boardId);
            expect(board).toBeDefined();
        });
    });

    it('should create two accounts', async () => {
        await data.transact(anonymous, async tx => {
            await getAccount({
                accounts: tx.accounts,
                boardService: tx.boardService,
                email: 'test1@email.com',
                fullName: 'Test User #1',
                users: tx.users,
                crypto: NodeCryptoProvider,
            });

            await getAccount({
                accounts: tx.accounts,
                boardService: tx.boardService,
                email: 'test2@email.com',
                fullName: 'Test User #2',
                users: tx.users,
                crypto: NodeCryptoProvider,
            });
        });
    });

    it('should send sign in email', async () => {
        const emailProvider = new MemEmailProvider();

        await data.transact(anonymous, async tx => {
            await authApi.sendSignInEmail.handle(
                {
                    boardService: tx.boardService,
                    crypto: NodeCryptoProvider,
                    emailService: tx.emailService,
                    jwt: {
                        sign: async () => '',
                        verify: async () => ({
                            exp: 0,
                            iat: 0,
                            sub: createUuidV4(),
                            uid: createUuidV4(),
                        }),
                    },
                    tx: tx,
                },
                {email: 'test@email.com'},
                {
                    method: 'auth',
                    headers: {
                        traceparent: '',
                        tracestate: '',
                        auth: undefined,
                    },
                    requestId: createUuidV4() as RpcMessageId,
                    principal: anonymous,
                }
            );
        });
    });
});
