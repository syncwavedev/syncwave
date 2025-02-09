<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import {getSdk} from '$lib/utils';
	import {
		Crdt,
		parseCrdtDiff,
		stringifyCrdtDiff,
		type BoardDto,
	} from 'syncwave-data';
	import MemberListLoader from './member-list-loader.svelte';

	let {board}: {board: BoardDto} = $props();

	let boardCrdt = Crdt.load(board.state);

	let boardName = $state(board.name);

	$effect(() => {
		boardCrdt.apply(board.state);

		boardName = boardCrdt.snapshot().name;
	});

	const sdk = getSdk();

	async function setBoardName() {
		const diff = boardCrdt.update(x => {
			x.name = boardName;
		});
		if (diff) {
			await sdk(rpc =>
				rpc.applyBoardDiff({
					boardId: board.id,
					diff: stringifyCrdtDiff(diff),
				})
			);
		}
	}
</script>

<div class="flex flex-col gap-4">
	<div>
		<Input
			bind:value={boardName}
			onkeyup={setBoardName}
			placeholder="Board name"
		/>
	</div>

	<div>
		Members
		<MemberListLoader boardId={board.id} />
	</div>
</div>
