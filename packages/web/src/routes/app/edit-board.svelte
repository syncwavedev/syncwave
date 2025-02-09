<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import {getSdk} from '$lib/utils';
	import {type BoardDto} from 'syncwave-data';
	import MemberListLoader from './member-list-loader.svelte';

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

<div class="flex flex-col gap-4">
	<div>
		<Input
			bind:value={boardName}
			onchange={setBoardName}
			placeholder="Board name"
		/>
	</div>

	<div>
		Members
		<MemberListLoader boardId={board.id} />
	</div>
</div>
