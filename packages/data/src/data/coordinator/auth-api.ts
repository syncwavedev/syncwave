import {z} from 'zod';
import {
    AUTH_ACTIVITY_WINDOW_ALLOWED_ACTIONS_COUNT,
    AUTH_ACTIVITY_WINDOW_HOURS,
} from '../../constants.js';
import {addHours, getNow} from '../../timestamp.js';
import {whenAll} from '../../utils.js';
import {createApi, handler} from '../communication/rpc.js';
import {TransactionContext} from '../data-layer.js';
import {CryptoService, EmailService, JwtService} from '../infra.js';
import {
    createIdentityId,
    Identity,
    IdentityRepo,
    VerificationCode,
} from '../repos/identity-repo.js';
import {createUserId, UserId, UserRepo} from '../repos/user-repo.js';
import {VerifySignInCodeResponse} from './coordinator.js';

export function createAuthApi({
    ctx,
    jwt,
    crypto,
    emailService,
    enqueueEffect,
}: {
    ctx: TransactionContext;
    jwt: JwtService;
    crypto: CryptoService;
    emailService: EmailService;
    enqueueEffect: (cb: () => Promise<void>) => void;
}) {
    return createApi({
        debug: handler({
            schema: z.object({}),
            handle: async () => {
                return {};
            },
        }),
        sendSignInEmail: handler({
            schema: z.object({
                email: z.string(),
            }),
            handle: async ({
                email,
            }): Promise<{type: 'success'} | {type: 'cooldown'}> => {
                const verificationCode = await createVerificationCode(crypto);

                const identity = await getIdentity(
                    ctx.identities,
                    ctx.users,
                    email,
                    crypto
                );

                if (await needsCooldown(identity)) {
                    return {type: 'cooldown'};
                }

                await ctx.identities.update(identity.id, x => {
                    x.verificationCode = verificationCode;
                    pushActivityLog(x);
                });

                enqueueEffect(async () => {
                    await emailService.send({
                        recipient: email,
                        html: `<p>
                                    Hi there!<br />
                                    <br />
                                    We noticed a request to sign into your Ground account.<br />
                                    If this wasn't you, no worries—just ignore this email.<br />
                                    <br />
                                    Your one-time code is: <strong>${verificationCode.code}</strong><br />
                                    <br />
                                    Have a great day!<br />
                                    The Ground Team
                                </p>`,
                        subject: 'Your Ground Account Sign-In Code',
                        text: `Hi there!
                    
We noticed a request to sign into your Ground account. If this wasn't you, no worries—just ignore this email.

Your one-time code is: ${verificationCode.code}

Have a great day!
The Ground Team`,
                    });
                });

                return {type: 'success'};
            },
        }),
        verifySignInCode: handler({
            schema: z.object({
                email: z.string(),
                code: z.string(),
            }),
            handle: async ({
                email,
                code,
            }): Promise<VerifySignInCodeResponse> => {
                const identity = await ctx.identities.getByEmail(email);
                if (!identity) {
                    throw new Error('invalid email, no identity found');
                }

                if (await needsCooldown(identity)) {
                    return {type: 'cooldown'};
                }

                if (identity.verificationCode === undefined) {
                    throw new Error('verification code was not requested');
                }

                if (getNow() > identity.verificationCode.expires) {
                    return {type: 'code_expired'};
                }

                await ctx.identities.update(identity.id, x => {
                    pushActivityLog(x);
                });

                if (code !== identity.verificationCode.code) {
                    return {type: 'invalid_code'};
                }

                return {
                    type: 'success',
                    token: await signJwtToken(
                        jwt,
                        identity,
                        ctx.config.jwtSecret
                    ),
                };
            },
        }),
    });
}

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

export async function getIdentity(
    identities: IdentityRepo,
    users: UserRepo,
    email: string,
    crypto: CryptoService
): Promise<Identity> {
    const existingIdentity = await identities.getByEmail(email);
    if (existingIdentity) {
        return existingIdentity;
    }

    const now = getNow();
    const userId = createUserId();

    const [identity] = await whenAll([
        identities.create({
            id: createIdentityId(),
            createdAt: now,
            updatedAt: now,
            email,
            userId,
            verificationCode: await createVerificationCode(crypto),
            authActivityLog: [],
        }),
        users.create({
            id: userId,
            createdAt: now,
            updatedAt: now,
        }),
    ]);

    return identity;
}
