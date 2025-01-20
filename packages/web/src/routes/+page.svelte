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
			codec: new MsgpackrCodec(),
			logger: new ConsoleLogger()
		});
		const participant = new Participant(transport, browser ? 'local' : 'proxy');

		return participant;
	}

	export const participant = createParticipant();

	$effect(() => {
		(async () => {
			await participant.signUp('tilyupo@gmail.com', '123456');
			const token = await participant.signIn('tilyupo@gmail.com', '123456');
			assert(token.type === 'success');
			participant.authenticate(token.token);

			// await participant.db.createBoard({
			//     boardId: createBoardId(),
			//     name: 'test',
			//     slug: 'super slug 10',
			// });
			const board = await participant.db.getMyBoards({});
			console.log({ board });
		})();
	});

	onDestroy(() => {
		participant.close();
	});
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<Button>Hello</Button>
