import '../instrumentation.js';

import 'dotenv/config';

import Router from '@koa/router';
import {
    type AttachmentId,
    context,
    CoordinatorServer,
    getGoogleUser,
    type GoogleOptions,
    log,
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

    router.get('/attachment/:id', async ctx => {
        const {id} = ctx.params;
        if (typeof id !== 'string') {
            ctx.status = 400;
            ctx.body = {
                error: 'id must be a string',
            };
            return;
        }
        const jwt = ctx.query['access_token'];
        if (typeof jwt !== 'string' && typeof jwt !== 'undefined') {
            ctx.status = 400;
            ctx.body = {
                error: 'access_token must be a string',
            };
            return;
        }
        if (typeof jwt === 'undefined') {
            ctx.status = 401;
            ctx.body = {
                error: 'access_token is required',
            };
            return;
        }
        const object = await coordinator().getAttachment({
            attachmentId: id as AttachmentId,
            jwt: jwt,
        });
        if (object === undefined) {
            ctx.status = 404;
            ctx.body = {
                error: 'attachment not found',
            };
            return;
        }
        ctx.status = 200;
        ctx.body = object.data;
        ctx.type = object.metadata.contentType;
        ctx.set('Content-Disposition', `attachment; filename=${id}`);
        ctx.set('Content-Length', object.size.toString());
    });

    router.get(`/health`, async ctx => {
        const status = await coordinator().status();
        ctx.status = status.status === 'ok' ? 200 : 500;
        ctx.body = status;
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
                    log.warn({
                        msg: `Google user has unverified email: ${result.user.email}`,
                    });
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
                log.error({error, msg: 'failed to handle google callback'});
                return ctx.redirect(`${options.appUrl}/login/failed`);
            }
        });
    }

    return router;
}
