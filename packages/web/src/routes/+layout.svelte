<script lang="ts">
	import '../app.css';

	import {onDestroy, setContext} from 'svelte';
	import {type LayoutProps} from './$types';
	import {browser} from '$app/environment';
	import {MsgpackCodec, ConsoleLogger, ParticipantClient, Cx} from 'ground-data';
	import {appConfig} from '../lib/config';
	import {WsTransportClient} from '../ws-transport-client';
	import {Toaster} from '$lib/components/ui/sonner/index.js';
	import {AuthManager} from '$lib/auth-manager';
	import * as Dialog from '$lib/components/ui/dialog';
	import DevTools from '$lib/dev-tools/dev-tools.svelte';
	import {createAuthManager} from './utils';

	let {children, data}: LayoutProps = $props();

	const authManager = createAuthManager(data.serverCookies);
	setContext(AuthManager, authManager);

	function createParticipantClient() {
		const transport = new WsTransportClient({
			url: appConfig.serverWsUrl,
			codec: new MsgpackCodec(),
			logger: new ConsoleLogger(),
		});
		const jwt = authManager.getJwt();
		const participant = new ParticipantClient(Cx.todo(), transport, jwt);

		return participant;
	}

	export const participantClient = createParticipantClient();
	setContext(ParticipantClient, participantClient);

	onDestroy(() => {
		participantClient.close(Cx.todo());
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

<Toaster />

<svelte:window on:keydown={on_key_down} />

<Dialog.Root bind:open={devToolsOpen}>
	<Dialog.Content class="max-w-[1000px]">
		<Dialog.Header>
			<Dialog.Description>
				<DevTools />
			</Dialog.Description>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>

{@render children()}
