<script lang="ts">
	import '../app.css';

	import {onDestroy, setContext} from 'svelte';
	import {type LayoutProps} from './$types';
	import {UniversalStore} from '$lib/universal-store';
	import {browser} from '$app/environment';
	import {MsgpackrCodec, ConsoleLogger, Participant} from 'ground-data';
	import {appConfig} from '../lib/config';
	import {WsTransportClient} from '../ws-transport-client';
	import {Toaster} from '$lib/components/ui/sonner/index.js';
	import {AuthManager} from '$lib/auth-manager';
	import * as Dialog from '$lib/components/ui/dialog';
	import DevTools from '$lib/dev-tools/dev-tools.svelte';

	let {children, data}: LayoutProps = $props();

	const cookieMap = new Map(data.serverCookies.map(({name, value}) => [name, value]));
	const universalStore = new UniversalStore(cookieMap);
	const authManager = new AuthManager(universalStore);
	setContext(UniversalStore, universalStore);
	setContext(AuthManager, authManager);

	function createParticipant() {
		const transport = new WsTransportClient({
			url: appConfig.serverWsUrl,
			codec: new MsgpackrCodec(),
			logger: new ConsoleLogger(),
		});
		const participant = new Participant(transport, browser ? 'local' : 'proxy');
		const jwt = authManager.getJwt();
		if (jwt) {
			participant.authenticate(jwt);
		}

		return participant;
	}

	export const participant = createParticipant();
	setContext(Participant, participant);

	onDestroy(() => {
		participant.close();
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
			<Dialog.Title>DevTools</Dialog.Title>
			<Dialog.Description>
				<DevTools />
			</Dialog.Description>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>

{@render children()}
