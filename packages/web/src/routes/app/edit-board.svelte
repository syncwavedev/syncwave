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

	let {board: remoteBoard}: {board: BoardDto} = $props();

	let localBoard = Crdt.load(remoteBoard.state);
	$effect(() => {
		localBoard.apply(parseCrdtDiff(remoteBoard.state));
		newBoardName = localBoard.snapshot().name;
	});

	let newBoardName = $state(remoteBoard.name);

	const sdk = getSdk();

	async function setBoardName() {
		const diff = localBoard.update(x => {
			x.name = newBoardName;
		});
		if (diff) {
			await sdk(rpc =>
				rpc.applyBoardDiff({
					boardId: remoteBoard.id,
					diff: stringifyCrdtDiff(diff),
				})
			);
		}
	}
</script>

<div class="flex flex-col gap-4">
	<div>
		<Input
			oninput={setBoardName}
			bind:value={newBoardName}
			placeholder="Board name"
		/>
	</div>

	<div>
		Members
		<MemberListLoader boardId={remoteBoard.id} />
	</div>
</div>
