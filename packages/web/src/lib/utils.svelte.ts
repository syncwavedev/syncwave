import {browser} from '$app/environment';
import {goto} from '$app/navigation';
import {onDestroy} from 'svelte';
import {
	BusinessError,
	CancelledError,
	Deferred,
	log,
	Stream,
	toError,
	toStream,
	wait,
	type ParticipantRpc,
} from 'syncwave-data';
import {getSdk} from './utils';

export interface State<T> {
	value: T;
}

export async function fetchState<T>(
	fn: (rpc: ParticipantRpc) => AsyncIterable<T>
): Promise<State<T>> {
	const result = new Deferred<State<T>>();
	const state: State<T | undefined> = $state({
		value: undefined,
	});

	useStream(fn, value => {
		state.value = value;
		result.resolve(state as State<T>);
	});

	return result.promise;
}

export function getState<T>(
	initialValue: T,
	fn: (rpc: ParticipantRpc) => Stream<T>
): State<T> {
	const state: State<T> = $state({value: initialValue});

	useStream(fn, value => {
		state.value = value;
	});

	return state;
}

function useStream<T>(
	fn: (rpc: ParticipantRpc) => AsyncIterable<T>,
	onNext: (value: T) => void
) {
	const sdk = getSdk();

	if (browser) {
		let cancelled = false;
		(async function retry() {
			while (!cancelled) {
				try {
					const value$ = sdk(x => {
						return toStream(fn(x));
					});

					for await (const value of value$) {
						if (cancelled) {
							break;
						}
						onNext(value);
					}
				} catch (e) {
					if (!cancelled) {
						log.error(toError(e), 'observable failed');
					}
					if (e instanceof CancelledError) return;
					if (e instanceof BusinessError) {
						if (e.code === 'forbidden') {
							log.error('Access denied');
							goto('/app');
						}
						return;
					}
				}

				await wait({ms: 1000, onCancel: 'resolve'});
			}
		})();

		onDestroy(() => {
			cancelled = true;
		});
	}
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
