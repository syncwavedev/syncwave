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

	let {children, data}: LayoutProps = $props();

	const cookieMap = new Map(data.serverCookies.map(({name, value}) => [name, value]));
	const universalStore = new UniversalStore(cookieMap);
	setContext(UniversalStore, universalStore);
	setContext(AuthManager, new AuthManager(universalStore));

	function createParticipant() {
		const transport = new WsTransportClient({
			url: appConfig.serverWsUrl,
			codec: new MsgpackrCodec(),
			logger: new ConsoleLogger(),
		});
		const participant = new Participant(transport, browser ? 'local' : 'proxy');

		return participant;
	}

	export const participant = createParticipant();
	setContext(Participant, participant);

	onDestroy(() => {
		participant.close();
	});
</script>

<Toaster />

{@render children()}
