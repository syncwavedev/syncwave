import {browser} from '$app/environment';
import {onDestroy} from 'svelte';
import {Deferred, type Observable, type ParticipantRpc} from 'syncwave-data';
import {getSdk} from './utils';

export interface State<T> {
	value: T;
}

export async function fetchState<TValue, TUpdate>(
	fn: (rpc: ParticipantRpc) => Observable<TValue, TUpdate>
): Promise<State<TValue | TUpdate>> {
	const result = new Deferred<State<TValue | TUpdate>>();

	const sdk = getSdk();

	if (browser) {
		let cancelled = false;
		(async () => {
			const [initialValue, update$] = await sdk(fn);
			const state: State<TValue | TUpdate> = $state({value: initialValue});

			result.resolve(state);

			(async () => {
				for await (const next of update$) {
					if (cancelled) {
						break;
					}
					state.value = next;
				}
			})();
		})();

		onDestroy(() => {
			cancelled = true;
		});
	}

	return result.promise;
}

export function getState<TValue, TUpdate>(
	initialValue: TValue | TUpdate,
	fn: (rpc: ParticipantRpc) => Observable<TValue, TUpdate>
): State<TValue | TUpdate> {
	const state: State<TValue | TUpdate> = $state({value: initialValue});

	const sdk = getSdk();

	if (browser) {
		let cancelled = false;
		(async () => {
			const [initialValue, update$] = await sdk(fn);
			state.value = initialValue;

			(async () => {
				for await (const next of update$) {
					if (cancelled) {
						break;
					}
					state.value = next;
				}
			})();
		})();

		onDestroy(() => {
			cancelled = true;
		});
	}

	return state;
}
