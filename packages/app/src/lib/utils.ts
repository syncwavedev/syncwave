import {getContext, onDestroy, setContext} from 'svelte';
import type {Timestamp} from 'syncwave';
import {
    AppError,
    CancelledError,
    context,
    CoordinatorClient,
    getReadableError,
    log,
    MsgpackCodec,
    PersistentConnection,
    runAll,
    toStream,
    unimplemented,
    type CoordinatorRpc,
    type Unsubscribe,
} from 'syncwave';
import {AuthManager} from '../auth-manager';
import {WsTransportClient} from '../ws-transport-client';
import {appConfig} from './config';

import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import {UploadManager} from './upload-manager.svelte';

TimeAgo.addDefaultLocale(en);

export type Rpc = <R extends AsyncIterable<unknown> | Promise<unknown>>(
    fn: (rpc: CoordinatorRpc) => R
) => R;

export function getRpc(): Rpc {
    const client = getContext<CoordinatorClient>(CoordinatorClient);
    if (!client) {
        throw new Error('context CoordinatorClient is not available');
    }
    const [componentCtx, cancelComponentCtx] = context().createChild({
        span: 'getRpc',
    });
    onDestroy(() => {
        cancelComponentCtx(
            new CancelledError('component destroyed', undefined)
        );
    });
    return <R extends AsyncIterable<unknown> | Promise<unknown>>(
        fn: (rpc: CoordinatorRpc) => R
    ) => {
        const [requestCtx, cancelRequestCtx] = componentCtx.createChild(
            {
                span: 'getRpc request',
            },
            true
        );

        const result = requestCtx.run(() => fn(client.rpc));

        if (result instanceof Promise) {
            return result.finally(() => {
                cancelRequestCtx('end of request');
            }) as R;
        }

        return toStream(result).finally(() => {
            cancelRequestCtx('end of request');
        }) as unknown as R;
    };
}

export function getAuthManager() {
    return getContext<AuthManager>(AuthManager);
}

export function setAuthManager(authManager: AuthManager) {
    setContext(AuthManager, authManager);
}

export function setUploadManager(store: UploadManager) {
    setContext(UploadManager, store);
}

export function getUploadManager() {
    const result = getContext<UploadManager>(UploadManager);
    if (!result) {
        throw new Error('context UploadManager is not available');
    }

    return result;
}

export function formatTime(timestamp: Timestamp) {
    const date = new Date(timestamp);

    return (
        date.getHours().toString().padStart(2, '0') +
        ':' +
        date.getMinutes().toString().padStart(2, '0')
    );
}

export interface CookieEntry {
    name: string;
    value: string;
}

export function createCoordinatorClient() {
    const authManager = getAuthManager();
    const jwt = authManager.getJwt();

    const coordinator = new CoordinatorClient(
        new PersistentConnection(
            new WsTransportClient({
                url: appConfig.serverWsUrl,
                codec: new MsgpackCodec(),
            })
        ),
        jwt ?? undefined
    );

    return coordinator;
}

export async function createDirectCoordinatorClient() {
    const authManager = new AuthManager(localStorage);
    const jwt = authManager.getJwt();
    const coordinator = new CoordinatorClient(
        await new WsTransportClient({
            url: appConfig.serverWsUrl,
            codec: new MsgpackCodec(),
        }).connect(),
        jwt ?? undefined
    );

    return coordinator;
}

export async function useRpc<T>(
    cookies: CookieEntry[],
    fn: (rpc: CoordinatorRpc) => Promise<T>
): Promise<T> {
    const [ctx, cancelCtx] = context().createChild({span: 'useRpc'}, true);
    try {
        let coordinator: CoordinatorClient | undefined = undefined;
        try {
            return await ctx.run(async () => {
                coordinator = await createDirectCoordinatorClient();
                return await fn(coordinator.rpc);
            });
        } finally {
            // eslint-disable-next-line @typescript-eslint/no-extra-non-null-assertion
            coordinator!?.close('end of useRpc');
        }
    } finally {
        cancelCtx(new AppError('end of useRpc'));
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function showErrorToast(_error: unknown) {
    unimplemented();
}

const timeAgo = new TimeAgo('en-US');

export function timeSince(ts: Timestamp) {
    return timeAgo.format(new Date(ts));
}

export function markErrorAsHandled(error: unknown) {
    log.info({msg: 'error handled + ' + getReadableError(error)});
}

export function fireEscape() {
    const highestPriority = escapeHandlers[0]?.priority;
    runAll(
        escapeHandlers
            .filter(x => x.priority === highestPriority)
            .map(x => x.cb)
    );
}

const escapeHandlers: Array<{priority: number; cb: () => void}> = [];

export const DIALOG_PRIORITY = 100;
export const CARD_DETAILS_PRIORITY = 10;

export function onEscape(priority: number, cb: () => void): Unsubscribe {
    const handler = {priority, cb};
    escapeHandlers.push(handler);
    escapeHandlers.sort((a, b) => b.priority - a.priority);
    return () => {
        const index = escapeHandlers.indexOf(handler);
        if (index !== -1) {
            escapeHandlers.splice(index, 1);
        }
    };
}
