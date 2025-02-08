import {browser} from '$app/environment';
import {onDestroy} from 'svelte';
import {
	BusinessError,
	CancelledError,
	log,
	toError,
	wait,
	type Observable,
	type ParticipantRpc,
} from 'syncwave-data';
import {getSdk} from './utils';

export interface State<T> {
	value: T;
}

export function getState<TValue, TUpdate>(
	initialValue: TValue | TUpdate,
	fn: (rpc: ParticipantRpc) => Observable<TValue, TUpdate>
): State<TValue | TUpdate> {
	const state: State<TValue | TUpdate> = $state({value: initialValue});

	const sdk = getSdk();

	if (browser) {
		let cancelled = false;
		(async function retry() {
			while (!cancelled) {
				try {
					const [initialValue, update$] = await sdk(fn);
					state.value = initialValue;

					for await (const next of update$) {
						if (cancelled) {
							break;
						}
						state.value = next;
					}
				} catch (e) {
					if (e instanceof CancelledError) return;
					log.error(toError(e), 'observable failed');
					if (e instanceof BusinessError) return;
				}

				await wait({ms: 1000, onCancel: 'resolve'});
			}
		})();

		onDestroy(() => {
			cancelled = true;
		});
	}

	return state;
}

export function toggle(initial = false) {
	const result = $state({
		value: initial,
		toggle: () => {
			result.value = !result.value;
		},
	});
	return result;
}
