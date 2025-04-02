import '../instrumentation.js';

import 'dotenv/config';

import Router from '@koa/router';
import {
    context,
    CoordinatorServer,
    getGoogleUser,
    type GoogleOptions,
    log,
    toError,
} from 'syncwave';

export interface ApiRouterOptions {
    appUrl: string;
    google: GoogleOptions | undefined;
}

export function createApiRouter(
    coordinator: () => CoordinatorServer,
    options: ApiRouterOptions
) {
    const router = new Router();

    router.use(async (ctx, next) => {
        await context().runChild(
            {
                span: 'http request',
                attributes: {
                    method: ctx.method,
                    path: ctx.path,
                    querystring: ctx.querystring,
                    ip: ctx.ip,
                    host: ctx.host,
                    protocol: ctx.protocol,
                },
            },
            async () => {
                await next();
            }
        );
    });

    router.get(`/health`, async ctx => {
        ctx.body = await coordinator().status();
    });

    if (options.google) {
        const googleOptions = options.google;

        router.get(`/callbacks/google`, async ctx => {
            try {
                const {code, state} = ctx.query;

                if (typeof code !== 'string') {
                    return ctx.redirect(`${options.appUrl}/login/failed`);
                }

                const result = await getGoogleUser(code, googleOptions);
                if (result.type === 'error') {
                    return ctx.redirect(`${options.appUrl}/login/failed`);
                }

                if (!result.user.verified_email || !result.user.email) {
                    log.warn(
                        `Google user has unverified email: ${result.user.email}`
                    );
                    return ctx.redirect(`${options.appUrl}/login/failed`);
                }

                const jwtToken = await coordinator().issueJwtByUserEmail({
                    email: result.user.email,
                    fullName:
                        (result.user.displayName as string) ?? 'Anonymous',
                });
                const jwtTokenComponent = encodeURIComponent(jwtToken);
                const redirectUrlComponent = encodeURIComponent(
                    (
                        JSON.parse(
                            decodeURIComponent(state as string)
                        ) as Record<string, string>
                    )?.redirectUrl ?? ''
                );

                return ctx.redirect(
                    `${options.appUrl}/login/callback/google?redirectUrl=${redirectUrlComponent}&token=${jwtTokenComponent}`
                );
            } catch (error) {
                log.error(toError(error), 'failed to handle google callback');
                return ctx.redirect(`${options.appUrl}/login/failed`);
            }
        });
    }

    return router;
}
