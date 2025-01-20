<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { onDestroy } from 'svelte';
	import { assert } from 'ground-data';

	import { ConsoleLogger, MsgpackrCodec, Participant, ReconnectConnection } from 'ground-data';
	import { WsTransportClient } from '../ws-transport-client.js';
	import { browser } from '$app/environment';

	function createParticipant() {
		const transport = new WsTransportClient({
			url: 'wss://api-ground-dev.edme.io:443',
			// url: 'ws://localhost:4567',
			codec: new MsgpackrCodec(),
			logger: new ConsoleLogger()
		});
		const participant = new Participant(transport, browser ? 'local' : 'proxy');

		return participant;
	}

	export const participant = createParticipant();

	$effect(() => {
		// participant.sendSignInEmail('tilyupo@gmail.com');
		participant
			.verifySignInCode(
				'tilyupo@gmail.com',
				'236550'.split('').map((x) => +x)
			)
			.then((x) => console.log(x));
	});

	onDestroy(() => {
		participant.close();
	});
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<Button>Hello</Button>
