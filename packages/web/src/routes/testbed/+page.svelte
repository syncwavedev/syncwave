<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import {getSdk} from '$lib/utils';
	import {
		Crdt,
		parseCrdtDiff,
		stringifyCrdtDiff,
		type BoardDto,
	} from 'syncwave-data';
	import {fetchState, getState} from '$lib/utils.svelte';

	const {data} = $props();
	const {boardKey, initialBoard} = data;

	const board = getState(initialBoard, x => x.getBoard({key: boardKey}));

	let localBoardCrdt = Crdt.load(initialBoard.state);

	let boardName = $state(board.value.name);
	let localBoardName = $state(localBoardCrdt.snapshot().name);
	let correct = $derived(board.value.name === localBoardName);

	const sdk = getSdk();

	async function setBoardName() {
		const diff = localBoardCrdt.update(x => {
			x.name = boardName;
		});
		if (diff) {
			localBoardCrdt.apply(diff);
			localBoardName = localBoardCrdt.snapshot().name;
			await sdk(rpc =>
				rpc.applyBoardDiff({
					boardId: board.value.id,
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
		{board.value.name} = {localBoardName}
		{correct}
	</div>
</div>
