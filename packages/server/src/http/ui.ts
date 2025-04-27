import Router from '@koa/router';
import fs from 'fs/promises';
import type {Context as KoaContext} from 'koa';
import serveStatic from 'koa-static';
import {createUuidV4, type SelfHostedClientConfig} from 'syncwave';

export async function createUiRouter(options: {
    staticPath: string;
    googleClientId: string | undefined;
    passwordsEnabled: boolean;
}) {
    const router = new Router();

    const clientConfig: SelfHostedClientConfig = {
        googleClientId: options.googleClientId,
        passwordsEnabled: options.passwordsEnabled,
    };

    const indexHtml = await fs
        .readFile(`${options.staticPath}/index.html`, 'utf-8')
        .then(html => {
            return html.replace(
                '</head>',
                `
                <script>
                    window.SELF_HOSTED_CONFIG = ${JSON.stringify(clientConfig)};
                </script></head>`
            );
        });

    async function serveIndexHtml(ctx: KoaContext) {
        ctx.body = indexHtml;
        ctx.set('Content-Type', 'text/html; charset=UTF-8');
        ctx.header['X-Content-Type-Options'] = 'nosniff';
    }

    router.get(['/', '/index.html'], serveIndexHtml);

    router.use(
        serveStatic(options.staticPath, {
            gzip: true,
            index: createUuidV4(),
        })
    );

    router.get('/:path(.*)', serveIndexHtml);

    return router;
}
