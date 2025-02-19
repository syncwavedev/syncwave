<script lang="ts">
	import {getSdk} from '$lib/utils';
	import {context, Crdt, stringifyCrdtDiff} from 'syncwave-data';
	import {observe} from '$lib/utils.svelte';

	const {data} = $props();
	const {boardKey, initialBoard} = data;

	const board = observe(initialBoard, x => x.getBoard({key: boardKey}));

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

	$effect(() => {
		const [ctx, cancel] = context().createChild({span: 'testbed'}, true);
		ctx.run(() => {
			const iter = (async function* () {
				const before = context().traceId;
				console.log('[testbed] before:', before);

				await new Promise(r => setTimeout(r, 1000));

				const after = context().traceId;
				console.log('[testbed] after:', after);
				console.log('[testbed] before === after:', before === after);
			})();

			(async () => {
				for await (const x of iter) {
					console.log('[testbed] value:', x);
				}
			})();
		});

		cancel('end of testbed effect');
	});
</script>

<div class="flex flex-col gap-4">
	<div>
		<input
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
