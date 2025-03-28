import {Type} from '@sinclair/typebox';
import type {BoardService} from '../data/board-service.js';
import type {DataEffectScheduler, DataTx} from '../data/data-layer.js';
import type {
    CryptoService,
    EmailService,
    JwtService,
} from '../data/infrastructure.js';
import {
    createIdentityId,
    type Identity,
    type IdentityRepo,
    type VerificationCode,
} from '../data/repos/identity-repo.js';
import {createUserId, UserRepo, type UserId} from '../data/repos/user-repo.js';
import {AppError} from '../errors.js';
import {createApi, handler} from '../transport/rpc.js';
import {whenAll} from '../utils.js';
import {createUuidV4} from '../uuid.js';
import {
    AUTH_ACTIVITY_WINDOW_ALLOWED_ACTIONS_COUNT,
    AUTH_ACTIVITY_WINDOW_HOURS,
} from './../constants.js';
import {addHours, getNow} from './../timestamp.js';
import {type VerifySignInCodeResponse} from './coordinator.js';

export interface AuthApiState {
    tx: DataTx;
    jwt: JwtService;
    crypto: CryptoService;
    emailService: EmailService;
    boardService: BoardService;
    scheduleEffect: DataEffectScheduler;
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
        sendSignInEmail: handler({
            req: Type.Object({
                email: Type.String(),
            }),
            res: Type.Union([
                Type.Object({type: Type.Literal('success')}),
                Type.Object({type: Type.Literal('cooldown')}),
            ]),
            handle: async (
                {
                    tx: {identities, users},
                    crypto,
                    boardService,
                    scheduleEffect,
                    emailService,
                },
                {email}
            ): Promise<{type: 'success'} | {type: 'cooldown'}> => {
                const verificationCode = await createVerificationCode(crypto);

                const identity = await getIdentity({
                    identities,
                    users,
                    email,
                    crypto,
                    fullName: undefined,
                    boardService,
                });

                if (await needsCooldown(identity)) {
                    return {type: 'cooldown'};
                }

                await identities.update(identity.id, doc => {
                    doc.verificationCode = verificationCode;
                    pushActivityLog(doc);
                });

                scheduleEffect(async () => {
                    await emailService.send({
                        recipient: email,
                        html: `<p>
                                    Hi there!<br />
                                    <br />
                                    We noticed a request to sign into your SyncWave account.<br />
                                    If this wasn't you, no worries—just ignore this email.<br />
                                    <br />
                                    Your one-time code is: <strong>${verificationCode.code}</strong><br />
                                    <br />
                                    Have a great day!<br />
                                    The SyncWave Team
                                </p>`,
                        subject: 'Your SyncWave Account Sign-In Code',
                        text: `Hi there!
                    
    We noticed a request to sign into your SyncWave account. If this wasn't you, no worries—just ignore this email.
    
    Your one-time code is: ${verificationCode.code}
    
    Have a great day!
    The SyncWave Team`,
                    });
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
                {tx: {identities, config}, crypto, jwt},
                {email, code}
            ): Promise<VerifySignInCodeResponse> => {
                const identity = await identities.getByEmail(email);
                if (!identity) {
                    throw new AppError('invalid email, no identity found');
                }

                if (await needsCooldown(identity)) {
                    return {type: 'cooldown'};
                }

                if (identity.verificationCode === undefined) {
                    throw new AppError('verification code was not requested');
                }

                if (getNow() > identity.verificationCode.expires) {
                    return {type: 'code_expired'};
                }

                await identities.update(identity.id, x => {
                    pushActivityLog(x);
                });

                if (code !== identity.verificationCode.code) {
                    return {type: 'invalid_code'};
                }

                const verificationCode = await createVerificationCode(crypto);
                await identities.update(identity.id, x => {
                    x.verificationCode = verificationCode;
                });

                return {
                    type: 'success',
                    token: await signJwtToken(jwt, identity, config.jwtSecret),
                };
            },
        }),
    });
}

export type AuthApi = ReturnType<typeof createAuthApi>;

export async function createVerificationCode(
    crypto: CryptoService
): Promise<VerificationCode> {
    const buf = await crypto.randomBytes(6);
    return {
        code: Array.from(buf)
            .map(x => x % 10)
            .join(''),
        // verification token expires after one hour
        expires: addHours(getNow(), 1),
    };
}

interface JwtPayload {
    sub: string;
    exp: number;
    uid: UserId;
    iat: number;
}

async function needsCooldown(identity: Identity): Promise<boolean> {
    const cutoff = addHours(getNow(), -AUTH_ACTIVITY_WINDOW_HOURS);
    const actions = identity.authActivityLog.filter(x => x > cutoff);
    return actions.length >= AUTH_ACTIVITY_WINDOW_ALLOWED_ACTIONS_COUNT;
}

function pushActivityLog(x: Identity) {
    x.authActivityLog.push(getNow());
    if (x.authActivityLog.length > AUTH_ACTIVITY_WINDOW_ALLOWED_ACTIONS_COUNT) {
        x.authActivityLog = x.authActivityLog.slice(
            -AUTH_ACTIVITY_WINDOW_ALLOWED_ACTIONS_COUNT
        );
    }
}

export async function signJwtToken(
    jwt: JwtService,
    identity: Identity,
    jwtSecret: string
) {
    const now = new Date();
    const exp = new Date(now.getTime());
    exp.setFullYear(exp.getFullYear() + 50);

    return await jwt.sign(
        {
            sub: identity.id.toString(),
            uid: identity.userId,
            exp: Math.trunc(exp.getTime() / 1000),
            iat: Math.trunc(now.getDate() / 1000),
        } satisfies JwtPayload,
        jwtSecret
    );
}

export const DEFAULT_BOARD_NAME = 'My First Board';

export async function getIdentity(params: {
    identities: IdentityRepo;
    users: UserRepo;
    email: string;
    crypto: CryptoService;
    fullName: string | undefined;
    boardService: BoardService;
}): Promise<Identity> {
    const existingIdentity = await params.identities.getByEmail(params.email);
    if (existingIdentity) {
        return existingIdentity;
    }

    const now = getNow();
    const userId = createUserId();

    const [identity] = await whenAll([
        params.identities.create({
            id: createIdentityId(),
            createdAt: now,
            updatedAt: now,
            email: params.email,
            userId,
            verificationCode: await createVerificationCode(params.crypto),
            authActivityLog: [],
            deleted: false,
        }),
        params.users.create({
            id: userId,
            createdAt: now,
            updatedAt: now,
            deleted: false,
            fullName: params.fullName ?? 'Anonymous',
            version: '4',
        }),
    ]);

    // we can't call createBoard in parallel to identity creation, because createBoard fetches
    // author info from the identity. we need to ensure that the identity is created first.
    await params.boardService.createBoard({
        authorId: userId,
        name: DEFAULT_BOARD_NAME,
        key: createUuidV4(),
        members: [],
    });

    return identity;
}
