import Router from '@koa/router';
import fs from 'fs/promises';
import serveStatic from 'koa-static';

export async function createAppRouter(staticPath: string) {
    const router = new Router();

    const staticPaths = (await fs.readdir(staticPath, {recursive: true})).map(
        path => `/${path}`
    );

    router.use(async (ctx, next) => {
        if (!staticPaths.includes(ctx.path)) {
            ctx.path = '/index.html';
        }

        await next();
    });

    router.use(serveStatic(staticPath));

    return router;
}
