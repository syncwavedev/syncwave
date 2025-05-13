import {Type} from '@sinclair/typebox';
import type {BoardService} from '../data/board-service.js';
import type {DataTx} from '../data/data-layer.js';
import type {EmailService} from '../data/email-service.js';
import type {CryptoProvider, JwtProvider} from '../data/infrastructure.js';
import {
    createAccountId,
    type Account,
    type AccountRepo,
} from '../data/repos/account-repo.js';
import {createUserId, UserRepo, type UserId} from '../data/repos/user-repo.js';
import {BOARD_ONBOARDING_TEMPLATE} from '../data/template.js';
import {AppError, BusinessError} from '../errors.js';
import {createApi, handler} from '../transport/rpc.js';
import {whenAll} from '../utils.js';
import {
    AUTH_ACTIVITY_WINDOW_ALLOWED_ACTIONS_COUNT,
    AUTH_ACTIVITY_WINDOW_MINUTES,
    AUTH_CODE_LENGTH,
} from './../constants.js';
import {addMinutes, getNow, Timestamp} from './../timestamp.js';
import {type VerifySignInCodeResponse} from './coordinator.js';

export interface AuthApiState {
    tx: DataTx;
    jwt: JwtProvider;
    crypto: CryptoProvider;
    boardService: BoardService;
    emailService: EmailService;
}

export function createAuthApi() {
    return createApi<AuthApiState>()({
        debug: handler({
            req: Type.Object({}),
            res: Type.Object({}),
            handle: async () => {
                return {};
            },
        }),
        register: handler({
            req: Type.Object({
                email: Type.String(),
                password: Type.String(),
                fullName: Type.String(),
                uiUrl: Type.String(),
            }),
            res: Type.Union([
                Type.Object({type: Type.Literal('account_email_taken')}),
                Type.Object({type: Type.Literal('success')}),
            ]),
            handle: async (
                {tx: {accounts, users, config}, crypto, boardService},
                {email, password, fullName}
            ) => {
                if (!config.passwordsEnabled) {
                    throw new BusinessError(
                        'Passwords auth is disabled',
                        'password_auth_disabled'
                    );
                }

                const existingAccount = await accounts.getByEmail(email);
                if (existingAccount) {
                    return {type: 'account_email_taken'};
                }

                await getAccount({
                    accounts,
                    boardService,
                    crypto,
                    email,
                    fullName,
                    users,
                    passwordHash: await crypto.bcryptHash(password),
                });

                return {type: 'success'};
            },
        }),
        signIn: handler({
            req: Type.Object({
                email: Type.String(),
                password: Type.String(),
            }),
            res: Type.Union([
                Type.Object({
                    type: Type.Literal('success'),
                    token: Type.String(),
                }),
                Type.Object({type: Type.Literal('invalid_password')}),
            ]),
            handle: async (
                {tx: {accounts}, crypto, jwt},
                {email, password}
            ) => {
                const account = await accounts.getByEmail(email);
                if (!account) {
                    return {type: 'invalid_password' as const};
                }

                if (!account.passwordHash) {
                    return {type: 'invalid_password' as const};
                }

                const passwordMatches = await crypto.bcryptCompare({
                    hash: account.passwordHash,
                    password,
                });
                if (!passwordMatches) {
                    return {type: 'invalid_password' as const};
                }

                return {
                    type: 'success' as const,
                    token: await signJwtToken(jwt, account),
                };
            },
        }),
        sendSignInEmail: handler({
            req: Type.Object({
                email: Type.String(),
                uiUrl: Type.String(),
            }),
            res: Type.Union([
                Type.Object({type: Type.Literal('success')}),
                Type.Object({type: Type.Literal('cooldown')}),
            ]),
            handle: async (
                {tx: {accounts, users}, crypto, boardService, emailService},
                {email}
            ): Promise<{type: 'success'} | {type: 'cooldown'}> => {
                const account = await getAccount({
                    accounts,
                    users,
                    email,
                    crypto,
                    fullName: undefined,
                    boardService,
                });

                if (await needsCooldown(account)) {
                    return {type: 'cooldown'};
                }

                const verificationCode = await createVerificationCode(crypto);
                const verificationCodeHash = await crypto.bcryptHash(
                    verificationCode.code
                );
                await accounts.update(account.id, doc => {
                    doc.verificationCode = {
                        codeHash: verificationCodeHash,
                        expires: verificationCode.expires,
                    };
                    pushActivityLog(doc);
                });

                emailService.scheduleSignInEmail({
                    email,
                    code: verificationCode.code,
                });

                return {type: 'success'};
            },
        }),
        verifySignInCode: handler({
            req: Type.Object({
                email: Type.String(),
                code: Type.String(),
            }),
            res: Type.Union([
                Type.Object({
                    type: Type.Literal('success'),
                    token: Type.String(),
                }),
                Type.Object({type: Type.Literal('invalid_code')}),
                Type.Object({type: Type.Literal('code_expired')}),
                Type.Object({type: Type.Literal('cooldown')}),
            ]),
            handle: async (
                {tx: {accounts}, crypto, jwt},
                {email, code}
            ): Promise<VerifySignInCodeResponse> => {
                const account = await accounts.getByEmail(email);
                if (!account) {
                    throw new AppError('invalid email, no account found');
                }

                if (await needsCooldown(account)) {
                    return {type: 'cooldown'};
                }

                if (account.verificationCode === undefined) {
                    throw new AppError('verification code was not requested');
                }

                if (getNow() > account.verificationCode.expires) {
                    return {type: 'code_expired'};
                }

                await accounts.update(account.id, x => {
                    pushActivityLog(x);
                });

                const codeMatches = await crypto.bcryptCompare({
                    hash: account.verificationCode.codeHash,
                    password: code,
                });

                if (!codeMatches) {
                    return {type: 'invalid_code'};
                }

                const verificationCode = await createVerificationCode(crypto);
                const verificationCodeHash = await crypto.bcryptHash(
                    verificationCode.code
                );
                await accounts.update(account.id, x => {
                    x.verificationCode = {
                        codeHash: verificationCodeHash,
                        expires: verificationCode.expires,
                    };
                });

                return {
                    type: 'success',
                    token: await signJwtToken(jwt, account),
                };
            },
        }),
    });
}

export type AuthApi = ReturnType<typeof createAuthApi>;

export async function createVerificationCode(
    crypto: CryptoProvider
): Promise<{code: string; expires: Timestamp}> {
    let digits: number[];

    do {
        digits = Array.from(await crypto.randomBytes(AUTH_CODE_LENGTH * 2))
            .filter(x => x < 250)
            .slice(0, AUTH_CODE_LENGTH)
            .map(x => x % 10);
    } while (digits.length < AUTH_CODE_LENGTH);

    return {
        code: digits.join(''),
        expires: addMinutes(getNow(), 10),
    };
}

interface JwtPayload {
    sub: string;
    exp: number;
    uid: UserId;
    iat: number;
}

async function needsCooldown(account: Account): Promise<boolean> {
    const cutoff = addMinutes(getNow(), -AUTH_ACTIVITY_WINDOW_MINUTES);
    const actions = account.authActivityLog.filter(x => x > cutoff);
    return actions.length >= AUTH_ACTIVITY_WINDOW_ALLOWED_ACTIONS_COUNT;
}

function pushActivityLog(x: Account) {
    x.authActivityLog.push(getNow());
    if (x.authActivityLog.length > AUTH_ACTIVITY_WINDOW_ALLOWED_ACTIONS_COUNT) {
        x.authActivityLog = x.authActivityLog.slice(
            -AUTH_ACTIVITY_WINDOW_ALLOWED_ACTIONS_COUNT
        );
    }
}

export async function signJwtToken(jwt: JwtProvider, account: Account) {
    const now = new Date();
    const exp = new Date(now.getTime());
    exp.setFullYear(exp.getFullYear() + 50);

    return await jwt.sign({
        sub: account.id.toString(),
        uid: account.userId,
        exp: Math.trunc(exp.getTime() / 1000),
        iat: Math.trunc(now.getDate() / 1000),
    } satisfies JwtPayload);
}

export const DEFAULT_BOARD_NAME = 'My First Board';

export async function getAccount(params: {
    accounts: AccountRepo;
    users: UserRepo;
    email: string;
    crypto: CryptoProvider;
    fullName: string | undefined;
    boardService: BoardService;
    skipBoardCreation?: boolean;
    isDemo?: boolean;
    passwordHash?: string;
    userId?: UserId;
}): Promise<Account> {
    const existingAccount = await params.accounts.getByEmail(params.email);
    if (existingAccount) {
        return existingAccount;
    }

    const now = getNow();
    const userId = params.userId ?? createUserId();

    const verificationCode = await createVerificationCode(params.crypto);
    const verificationCodeHash = await params.crypto.bcryptHash(
        verificationCode.code
    );

    const [account] = await whenAll([
        params.accounts.create({
            id: createAccountId(),
            createdAt: now,
            updatedAt: now,
            email: params.email,
            userId,
            verificationCode: {
                codeHash: verificationCodeHash,
                expires: verificationCode.expires,
            },
            authActivityLog: [],
            passwordHash: params.passwordHash,
        }),
        params.users.create({
            id: userId,
            createdAt: now,
            updatedAt: now,
            fullName: params.fullName ?? 'Anonymous',
            isDemo: params.isDemo ?? false,
        }),
    ]);

    if (!params.skipBoardCreation) {
        // we can't call createBoard in parallel to account creation, because createBoard fetches
        // author info from the account. we need to ensure that the account is created first.
        await params.boardService.createBoard({
            authorId: userId,
            name: DEFAULT_BOARD_NAME,
            members: [],
            template: BOARD_ONBOARDING_TEMPLATE,
            invite: false,
        });
    }

    return account;
}
