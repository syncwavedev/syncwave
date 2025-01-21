import { type ClassValue, clsx } from 'clsx';
import { Participant } from 'ground-data';
import { getContext } from 'svelte';
import { twMerge } from 'tailwind-merge';
import { UniversalStore } from './universal-store';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getSdk() {
	return getContext<Participant>(Participant);
}

export function getUniversalStore() {
	return getContext<UniversalStore>(UniversalStore);
}
