import {clsx, type ClassValue} from 'clsx';
import {getContext, onDestroy} from 'svelte';
import {toast} from 'svelte-sonner';
import {
	AppError,
	CancelledError,
	ConnectionPool,
	context,
	drop,
	MemTransportClient,
	MemTransportServer,
	MsgpackCodec,
	ParticipantClient,
	ParticipantServer,
	toStream,
	tracerManager,
	type ParticipantRpc,
} from 'syncwave-data';
import {twMerge} from 'tailwind-merge';
import type {Timestamp} from '../../../data/dist/esm/src/timestamp';
import {WsTransportClient} from '../ws-transport-client';
import {AuthManager} from './auth-manager';
import {appConfig} from './config';
import {UniversalStore} from './universal-store';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

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

export function showErrorToast() {
	toast.error('Oops! Something went wrong', {
		description:
			'Refresh the page or contact me at tilyupo@gmail.com if the issue persists.',
		duration: 15 * 1000,
	});
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

export function createAuthManager(cookies: CookieEntry[]) {
	const cookieMap = new Map(cookies.map(({name, value}) => [name, value]));
	const universalStore = new UniversalStore(cookieMap);
	const authManager = new AuthManager(universalStore);

	return authManager;
}

const transport = new WsTransportClient({
	url: appConfig.serverWsUrl,
	codec: new MsgpackCodec(),
});
const connectionPool = new ConnectionPool(transport);

export function createParticipantClient() {
	const authManager = getAuthManager();
	const jwt = authManager.getJwt();

	const partTransportServer = new MemTransportServer(new MsgpackCodec());
	const part = new ParticipantServer({
		client: connectionPool,
		server: partTransportServer,
	});

	drop(part.launch());

	const participant = new ParticipantClient(
		new MemTransportClient(partTransportServer, new MsgpackCodec()),
		jwt,
		tracerManager.get('view')
	);

	return participant;
}

export function createDirectParticipantClient(serverCookies: CookieEntry[]) {
	const authManager = createAuthManager(serverCookies);
	const jwt = authManager.getJwt();
	const participant = new ParticipantClient(
		connectionPool,
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
		const result = await ctx.run(async () => {
			const participant = createDirectParticipantClient(cookies);
			try {
				return await fn(participant.rpc);
			} finally {
				participant.close();
			}
		});
		return result;
	} finally {
		cancelCtx(new AppError('end of sdkOnce'));
	}
}
