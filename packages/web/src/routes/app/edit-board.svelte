<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import {getSdk} from '$lib/utils';
	import {Crdt, parseCrdtDiff, stringifyCrdtDiff, type BoardDto} from 'syncwave-data';
	import MemberListLoader from './member-list-loader.svelte';
	import {fetchState} from '$lib/utils.svelte';

	let {board}: {board: BoardDto} = $props();

	let info = fetchState(x => x.getBoard({key: board.key}));

	let boardCrdt = Crdt.load(board.state);
	let boardCrdtCopy = Crdt.load(board.state);

	let boardName = $state(board.name);

	$effect(() => {
		boardCrdt.apply(board.state);

		// boardName = boardCrdt.snapshot().name;
	});

	let subject = $state('');
	let shadow = $state('');

	const sdk = getSdk();

	async function setBoardName() {
		const diff = boardCrdt.update(x => {
			x.name = boardName;
		});
		if (diff) {
			console.log('send diff');
			await sdk(rpc =>
				rpc.applyBoardDiff({
					boardId: board.id,
					diff: stringifyCrdtDiff(diff),
				})
			);
			boardCrdtCopy.apply(diff);
			subject = boardCrdt.snapshot().name;
			shadow = boardCrdtCopy.snapshot().name;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<div>
		<Input bind:value={boardName} onkeyup={setBoardName} placeholder="Board name" />
	</div>

	<div>{subject} {shadow === subject && subject === boardName}</div>

	<div>
		{#await info then anotherCopy}
			Copy: {anotherCopy.value.name} {anotherCopy.value.name === boardName}
		{/await}
	</div>

	<div>
		Members
		<MemberListLoader boardId={board.id} />
	</div>
</div>
