import {getContext, onDestroy, setContext} from 'svelte';
import {
	AppError,
	CancelledError,
	context,
	CoordinatorClient,
	CoordinatorClientDummy,
	getReadableError,
	log,
	MsgpackCodec,
	PersistentConnection,
	runAll,
	toStream,
	unimplemented,
	type CoordinatorRpc,
	type MeDto,
	type Nothing,
	type Unsubscribe,
} from 'syncwave-data';
import type {Timestamp} from '../../../data/dist/esm/src/timestamp';
import {WsTransportClient} from '../ws-transport-client';
import {AuthManager} from './auth-manager';
import {appConfig} from './config';
import {UniversalStore} from './universal-store';

import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import {UploadManager} from './upload-manager.svelte';

TimeAgo.addDefaultLocale(en);

export function getRpc() {
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

export function setUniversalStore(store: UniversalStore) {
	setContext(UniversalStore, store);
}

export function getUniversalStore() {
	const result = getContext<UniversalStore>(UniversalStore);
	if (!result) {
		throw new Error('context UniversalStore is not available');
	}

	return result;
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

export function createAuthManager(store: UniversalStore) {
	const authManager = new AuthManager(store);

	return authManager;
}

export function createCoordinatorClientDummy(): CoordinatorClient {
	return new CoordinatorClientDummy() as CoordinatorClient;
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
		jwt
	);

	return coordinator;
}

export async function createDirectCoordinatorClient(
	serverCookies: CookieEntry[]
) {
	const authManager = createAuthManager(
		new UniversalStore(new Map(serverCookies.map(x => [x.name, x.value])))
	);
	const jwt = authManager.getJwt();
	const coordinator = new CoordinatorClient(
		await new WsTransportClient({
			url: appConfig.serverWsUrl,
			codec: new MsgpackCodec(),
		}).connect(),
		jwt
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
				coordinator = await createDirectCoordinatorClient(cookies);
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
	log.info('error handled + ' + getReadableError(error));
}

const ME_CONTEXT_KEY = 'me-context';
export interface MeContext {
	readonly value: MeDto;
}
export function setMe(me: MeContext) {
	setContext(ME_CONTEXT_KEY, me);
}

export function getMe() {
	const me = getContext<MeContext>(ME_CONTEXT_KEY);
	if (!me) {
		throw new Error('context MeDto is not available');
	}
	return me;
}

export function fireEscape() {
	const highestPriority = escapeHandlers[0]?.priority;
	runAll(
		escapeHandlers
			.filter(x => x.priority === highestPriority)
			.map(x => x.cb)
	);
}

const escapeHandlers: Array<{priority: number; cb: () => Nothing}> = [];

export const DIALOG_PRIORITY = 100;
export const CARD_DETAILS_PRIORITY = 10;

export function onEscape(priority: number, cb: () => Nothing): Unsubscribe {
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
