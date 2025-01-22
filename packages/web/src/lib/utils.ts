import {type ClassValue, clsx} from 'clsx';
import {Participant} from 'ground-data';
import {getContext} from 'svelte';
import {toast} from 'svelte-sonner';
import {twMerge} from 'tailwind-merge';
import {UniversalStore} from './universal-store';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getSdk() {
	return getContext<Participant>(Participant);
}

export function getUniversalStore() {
	return getContext<UniversalStore>(UniversalStore);
}

export function showErrorToast() {
	toast.error('Oops! Something went wrong', {
		description: 'Refresh the page or contact me at tilyupo@gmail.com if the issue persists.',
		duration: 15 * 1000,
	});
}
