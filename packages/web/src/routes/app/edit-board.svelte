<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import {getSdk} from '$lib/utils';
	import type {BoardDto} from 'syncwave-data';

	let {board}: {board: BoardDto} = $props();

	let boardName = $state(board.name);

	$effect(() => {
		boardName = board.name;
	});

	const sdk = getSdk();

	async function setBoardName() {
		await sdk(rpc =>
			rpc.setBoardName({boardId: board.id, name: boardName})
		);
	}
</script>

Board editor: {board.name}

<Input bind:value={boardName} onchange={setBoardName} />
