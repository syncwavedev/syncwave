import {getSchema} from '@tiptap/core';
import {generateHTML} from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import {getContext, onDestroy, setContext} from 'svelte';
import {
	AppError,
	CancelledError,
	context,
	drop,
	getReadableError,
	log,
	MemTransportClient,
	MemTransportServer,
	MsgpackCodec,
	ParticipantClient,
	ParticipantClientDummy,
	ParticipantServer,
	PersistentConnection,
	toStream,
	tracerManager,
	unimplemented,
	type MeDto,
	type ParticipantRpc,
} from 'syncwave-data';
import {yXmlFragmentToProsemirrorJSON} from 'y-prosemirror';
import {XmlFragment} from 'yjs';
import type {Timestamp} from '../../../data/dist/esm/src/timestamp';
import {WsTransportClient} from '../ws-transport-client';
import {AuthManager} from './auth-manager';
import {appConfig} from './config';
import {UniversalStore} from './universal-store';

import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import {UploadManager} from './upload-manager.svelte';

TimeAgo.addDefaultLocale(en);

export function getSdk() {
	const client = getContext<ParticipantClient>(ParticipantClient);
	if (!client) {
		throw new Error('context ParticipantClient is not available');
	}
	const [componentCtx, cancelComponentCtx] = context().createChild({
		span: 'getSdk',
	});
	onDestroy(() => {
		cancelComponentCtx(
			new CancelledError('component destroyed', undefined)
		);
	});
	return <R extends AsyncIterable<unknown> | Promise<unknown>>(
		fn: (rpc: ParticipantRpc) => R
	) => {
		const [requestCtx, cancelRequestCtx] = componentCtx.createChild(
			{
				span: 'getSdk request',
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

export function createParticipantClientDummy(): ParticipantClient {
	return new ParticipantClientDummy() as ParticipantClient;
}

export function createParticipantClient() {
	const authManager = getAuthManager();
	const jwt = authManager.getJwt();

	const partTransportServer = new MemTransportServer(new MsgpackCodec());
	const part = new ParticipantServer({
		client: new WsTransportClient({
			url: appConfig.serverWsUrl,
			codec: new MsgpackCodec(),
		}),
		server: partTransportServer,
	});

	drop(part.launch());

	const participant = new ParticipantClient(
		new PersistentConnection(
			new MemTransportClient(partTransportServer, new MsgpackCodec())
		),
		jwt,
		tracerManager.get('view')
	);

	return participant;
}

export async function createDirectParticipantClient(
	serverCookies: CookieEntry[]
) {
	const authManager = createAuthManager(
		new UniversalStore(new Map(serverCookies.map(x => [x.name, x.value])))
	);
	const jwt = authManager.getJwt();
	const participant = new ParticipantClient(
		await new WsTransportClient({
			url: appConfig.serverWsUrl,
			codec: new MsgpackCodec(),
		}).connect(),
		jwt,
		tracerManager.get('view')
	);

	return participant;
}

export async function sdkOnce<T>(
	cookies: CookieEntry[],
	fn: (rpc: ParticipantRpc) => Promise<T>
): Promise<T> {
	const [ctx, cancelCtx] = context().createChild({span: 'sdkOnce'}, true);
	try {
		let participant: ParticipantClient | undefined = undefined;
		try {
			return await ctx.run(async () => {
				participant = await createDirectParticipantClient(cookies);
				return await fn(participant.rpc);
			});
		} finally {
			// eslint-disable-next-line @typescript-eslint/no-extra-non-null-assertion
			participant!?.close('end of sdkOnce');
		}
	} finally {
		cancelCtx(new AppError('end of sdkOnce'));
	}
}

export function showErrorToast() {
	unimplemented();
}

const timeAgo = new TimeAgo('en-US');

export function timeSince(ts: Timestamp) {
	return timeAgo.format(new Date(ts));
}

const tiptapExtensions = [StarterKit];

export function yFragmentToJSON(fragment: XmlFragment) {
	return yXmlFragmentToProsemirrorJSON(fragment);
}

export function yFragmentToHtml(fragment: XmlFragment) {
	const prosemirrorJSON = yFragmentToJSON(fragment);
	return generateHTML(prosemirrorJSON, tiptapExtensions);
}

export function yFragmentToPlaintext(fragment: XmlFragment) {
	const schema = getSchema(tiptapExtensions);
	const prosemirrorJSON = yFragmentToJSON(fragment);
	const node = schema.nodeFromJSON(prosemirrorJSON);
	return node.textBetween(0, node.content.size, '\n', '\n');
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
