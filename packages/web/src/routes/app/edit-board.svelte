<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import {getSdk} from '$lib/utils';
	import type {Column, ColumnDto, Board, BoardDto} from 'syncwave-data';
	import * as Select from '$lib/components/ui/select/index.js';

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
