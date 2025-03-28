import Router from '@koa/router';
import fs from 'fs/promises';
import type {Context as KoaContext} from 'koa';
import serveStatic from 'koa-static';
import {createUuidV4} from 'syncwave';

export async function createUiRouter(options: {
    staticPath: string;
    googleClientId: string | undefined;
}) {
    const router = new Router();

    const indexHtml = await fs
        .readFile(`${options.staticPath}/index.html`, 'utf-8')
        .then(html => {
            return html.replace(
                '</head>',
                `
                <script>
                    window.CONFIG_GOOGLE_CLIENT_ID = ${JSON.stringify(options.googleClientId)};
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
