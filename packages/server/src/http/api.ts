import '../instrumentation.js';

import 'dotenv/config';

import Router from '@koa/router';
import Busboy from 'busboy';
import {Readable} from 'stream';
import {
    type AttachmentId,
    context,
    CoordinatorServer,
    getGoogleUser,
    type GoogleOptions,
    log,
    ObjectKey,
    ObjectMetadata,
    validateUuid,
} from 'syncwave';

export interface ApiRouterOptions {
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

    router.get('/objects/:key', async ctx => {
        const {key} = ctx.params;
        if (typeof key !== 'string') {
            ctx.status = 400;
            ctx.body = {
                error: 'id must be a string',
            };
            return;
        }
        if (!validateUuid(key)) {
            ctx.status = 400;
            ctx.body = {
                error: 'object key must be a valid UUID',
            };
            return;
        }
        const object = await coordinator().getObject(key as ObjectKey);
        if (object === undefined) {
            ctx.status = 404;
            ctx.body = {
                error: 'object not found',
            };
            return;
        }

        ctx.status = 200;
        ctx.set('Cache-Control', 'max-age=31536000, immutable');
        ctx.type = object.metadata.contentType;
        ctx.body = Readable.fromWeb(object.data as any);
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
        if (!validateUuid(id)) {
            ctx.status = 400;
            ctx.body = {
                error: 'id must be a valid UUID',
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

    router.post('/objects', async ctx => {
        // Wrap Busboy in a Promise so we can await the upload stream
        await new Promise<void>((resolve, reject) => {
            const busboy = Busboy({headers: ctx.req.headers});
            let handled = false;

            busboy.on('file', (_fieldname, file, {mimeType}) => {
                if (handled) {
                    // we only allow one file
                    file.resume();
                    return;
                }
                handled = true;

                const chunks: Buffer[] = [];
                file.on('data', (chunk: Buffer) => {
                    chunks.push(chunk);
                });

                file.on('end', async () => {
                    try {
                        const buffer = Buffer.concat(chunks);
                        const data = new Uint8Array(buffer);

                        // Build your metadata however you need it
                        const metadata: ObjectMetadata = {
                            contentType: mimeType,
                        };

                        // Store it
                        const objectKey = await coordinator().createAttachment({
                            contentType: mimeType,
                            stream: new ReadableStream<Uint8Array>({
                                start(controller) {
                                    controller.enqueue(data);
                                    controller.close();
                                },
                            }),
                            jwt: ctx.query['access_token'] as string,
                        });

                        ctx.status = 201;
                        ctx.body = {
                            objectKey,
                            size: data.length,
                            metadata,
                        };
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                });

                file.on('error', reject);
            });

            busboy.on('finish', () => {
                if (!handled) {
                    ctx.throw(400, 'No file field named "file" found');
                }
            });

            busboy.on('error', reject);

            ctx.req.pipe(busboy);
        });
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
                    return ctx.redirect(`${googleOptions.appUrl}/login/failed`);
                }

                const result = await getGoogleUser(code, googleOptions);
                if (result.type === 'error') {
                    return ctx.redirect(`${googleOptions.appUrl}/login/failed`);
                }

                if (!result.user.verified_email || !result.user.email) {
                    log.warn({
                        msg: `Google user has unverified email: ${result.user.email}`,
                    });
                    return ctx.redirect(`${googleOptions.appUrl}/login/failed`);
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
                    `${googleOptions.appUrl}/login/callback/google?redirectUrl=${redirectUrlComponent}&token=${jwtTokenComponent}`
                );
            } catch (error) {
                log.error({error, msg: 'failed to handle google callback'});
                return ctx.redirect(`${googleOptions.appUrl}/login/failed`);
            }
        });
    }

    return router;
}
