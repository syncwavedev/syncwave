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
	import {AuthManager} from '$lib/auth-manager';
	import {createAuthManager, createParticipantClient} from '$lib/utils';

	let {children, data}: LayoutProps = $props();

	const authManager = createAuthManager(data.serverCookies);
	setContext(AuthManager, authManager);

	export const participantClient = createParticipantClient();
	setContext(ParticipantClient, participantClient);

	onDestroy(() => {
		participantClient.close();
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

{@render children()}
