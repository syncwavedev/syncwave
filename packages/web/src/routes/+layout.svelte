<script module lang="ts">
	import {browser} from '$app/environment';
	if (browser) {
		window.addEventListener('unhandledrejection', event => {
			if (event.reason instanceof CancelledError) {
				event.preventDefault();

				return;
			}
		});
	}
</script>

<script lang="ts">
	import '../app.css';

	import {onDestroy, setContext} from 'svelte';
	import {type LayoutProps} from './$types';
	import {ParticipantClient, CancelledError} from 'syncwave-data';
	import {
		createAuthManager,
		createParticipantClient,
		createParticipantClientDummy,
		setAuthManager,
		setUniversalStore,
	} from '$lib/utils';
	import {UniversalStore} from '$lib/universal-store';
	import ErrorCard from '$lib/components/error-card.svelte';

	let {children, data}: LayoutProps = $props();

	const cookieMap = new Map(
		data.serverCookies.map(({name, value}) => [name, value])
	);
	const universalStore = new UniversalStore(cookieMap);
	setUniversalStore(universalStore);
	const authManager = createAuthManager(universalStore);
	setAuthManager(authManager);

	export const participantClient = browser
		? createParticipantClient()
		: createParticipantClientDummy(); // server must not use participantClient
	setContext(ParticipantClient, participantClient);

	onDestroy(() => {
		participantClient.close('layout destroyed');
	});

	let devToolsOpen = $state(false);

	function on_key_down(event: any) {
		const {key, ctrlKey, repeat} = event;
		if (repeat) return;

		switch (key) {
			case 'h':
				if (ctrlKey) {
					event.preventDefault();
					devToolsOpen = true;
					break;
				}
		}
	}
</script>

<svelte:window on:keydown={on_key_down} />

<svelte:boundary>
	{#snippet failed(error, reset)}
		<ErrorCard {error} {reset} />
	{/snippet}
	{@render children()}
</svelte:boundary>
