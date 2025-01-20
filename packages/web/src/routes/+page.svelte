<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { participant } from '../participant.js';
	import { assert } from 'ground-data';

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
		const me = await participant.db.getMe({});
		const board = await participant.db.getMyBoards({});
		console.log({ board });
	})();
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<Button>Hello</Button>
