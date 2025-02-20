<script lang="ts">
	import ScrollArea from '$lib/components/scroll-area.svelte';
	import UploadButton from '$lib/components/upload-button.svelte';
	import {getAuthManager, getSdk} from '$lib/utils';
	import {observe} from '$lib/utils.svelte';
	import {
		Crdt,
		stringifyCrdtDiff,
		toCrdtDiff,
		type Board,
	} from 'syncwave-data';

	const sdk = getSdk();
	const userId = getAuthManager().getIdentityInfo()?.userId!;

	let {data} = $props();

	const remoteBoard = observe(data.initialBoard, x =>
		x.getBoard({key: data.boardKey})
	);
	const localBoard = Crdt.load(remoteBoard.value.state);
	let localBoardName = $state(remoteBoard.value.name);
	$effect(() => {
		localBoard.apply(remoteBoard.value.state);
		localBoardName = localBoard.snapshot().name;
	});

	async function handleInput() {
		const diff = localBoard.update(x => {
			x.name = localBoardName;
		});
		if (diff) {
			await sdk(x =>
				x.applyBoardDiff({
					boardId: remoteBoard.value.id,
					diff: stringifyCrdtDiff(diff),
				})
			);
		}
	}
</script>

<div class="flex flex-col gap-4">testbed</div>

<input class="border" bind:value={localBoardName} oninput={handleInput} />
<br />
{remoteBoard.value.name}
<br />
{remoteBoard.value.name === localBoardName}
