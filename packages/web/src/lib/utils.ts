import {clsx, type ClassValue} from 'clsx';
import {context, MsgpackCodec, ParticipantClient, type ParticipantRpc} from 'ground-data';
import {getContext, onDestroy} from 'svelte';
import {toast} from 'svelte-sonner';
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
	const [ctx, cancelCtx] = context().createChild();
	onDestroy(() => cancelCtx());
	return <R>(fn: (rpc: ParticipantRpc) => R) => ctx.run(() => fn(client.rpc));
}

export function getAuthManager() {
	return getContext<AuthManager>(AuthManager);
}

export function showErrorToast() {
	toast.error('Oops! Something went wrong', {
		description: 'Refresh the page or contact me at tilyupo@gmail.com if the issue persists.',
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

export function createParticipantClient(serverCookies: CookieEntry[]) {
	const authManager = createAuthManager(serverCookies);
	const transport = new WsTransportClient({
		url: appConfig.serverWsUrl,
		codec: new MsgpackCodec(),
	});
	const jwt = authManager.getJwt();
	const participant = new ParticipantClient(transport, jwt);

	return participant;
}

export async function pageSdk<T>(
	cookies: CookieEntry[],
	fn: (rpc: ParticipantRpc) => Promise<T>
): Promise<T> {
	const [ctx, cancelCtx] = context().createChild();
	const result = await ctx.run(async () => {
		const participant = createParticipantClient(cookies);
		return await fn(participant.rpc);
	});
	cancelCtx();
	return result;
}
