<script lang="ts">
	import ScrollArea from '$lib/components/scroll-area.svelte';
	import UploadButton from '$lib/components/upload-button.svelte';
	import {getAuthManager, getSdk} from '$lib/utils';
	import {observe} from '$lib/utils.svelte';
	import {untrack} from 'svelte';
	import {
		Crdt,
		log,
		stringifyCrdtDiff,
		toCrdtDiff,
		type Board,
		type CrdtDiff,
	} from 'syncwave-data';

	const sdk = getSdk();

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

	let diffQueue: CrdtDiff<Board>[] = [];

	$effect(() => {
		untrack(() => {
			(async () => {
				while (true) {
					if (diffQueue.length === 0) {
						await new Promise(resolve => setTimeout(resolve, 10));
						continue;
					}
					const combinedDiff = stringifyCrdtDiff(
						Crdt.merge(diffQueue)
					);
					diffQueue = [];
					await sdk(x =>
						x.applyBoardDiff({
							boardId: remoteBoard.value.id,
							diff: combinedDiff,
						})
					);
				}
			})().catch(error => {
				log.error(error, 'Error in diff queue');
			});
		});
	});

	async function handleInput() {
		const diff = localBoard.update(x => {
			x.name = localBoardName;
		});
		if (diff) {
			diffQueue.push(diff);
		}
	}
</script>

<div class="flex flex-col gap-4">testbed</div>

<input class="border" bind:value={localBoardName} oninput={handleInput} />
<br />
{remoteBoard.value.name}
<br />
{remoteBoard.value.name === localBoardName}
