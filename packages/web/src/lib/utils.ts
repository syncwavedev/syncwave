import {clsx, type ClassValue} from 'clsx';
import {context, ParticipantClient, type ParticipantRpc} from 'ground-data';
import {getContext, onDestroy} from 'svelte';
import {toast} from 'svelte-sonner';
import {twMerge} from 'tailwind-merge';
import {AuthManager} from './auth-manager';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getSdk() {
	const client = getContext<ParticipantClient>(ParticipantClient);
	const [ctx, cancelCtx] = context().createChild();
	onDestroy(() => cancelCtx());
	return <R>(rpc: (rpc: ParticipantRpc) => R) => ctx.run(() => rpc(client.rpc));
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
