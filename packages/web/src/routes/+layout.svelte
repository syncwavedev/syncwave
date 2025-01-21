<script lang="ts">
	import '../app.css';

	import { onDestroy, setContext } from 'svelte';
	import { type LayoutProps } from './$types';
	import { UniversalStore } from '$lib/universal-store';
	import { browser } from '$app/environment';
	import { MsgpackrCodec, ConsoleLogger, Participant } from 'ground-data';
	import { appConfig } from '../config';
	import { WsTransportClient } from '../ws-transport-client';

	let { children, data }: LayoutProps = $props();

	const cookieMap = new Map(data.serverCookies.map(({ name, value }) => [name, value]));
	setContext(UniversalStore, new UniversalStore(cookieMap));

	function createParticipant() {
		const transport = new WsTransportClient({
			url: appConfig.serverWsUrl,
			codec: new MsgpackrCodec(),
			logger: new ConsoleLogger()
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

{@render children()}
