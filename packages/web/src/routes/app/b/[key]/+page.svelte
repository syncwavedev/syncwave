<script lang="ts">
	import {observe} from '$lib/utils.svelte';
	import {log} from 'syncwave-data';

	import {goto} from '$app/navigation';
	import BoardViewController from '$lib/components/board-view-controller.svelte';
	import SearchIcon from '$lib/components/icons/search-icon.svelte';
	import PlusIcon from '$lib/components/icons/plus-icon.svelte';

	const {data} = $props();
	const {boardKey, initialBoard} = data;

	const board = observe(initialBoard, x => {
		return x.getBoardView({key: boardKey});
	});

	$effect(() => {
		if (board.value.deleted) {
			log.info(`board ${board.value.id} got deleted, redirect to app...`);
			goto('/app');
		}
	});
</script>

<div class="sticky top-0 z-10">
	<div class="action-bar">
		<div class="text-xs">Syncwave Core</div>
		<button class="btn--icon ml-auto">
			<SearchIcon />
		</button>
		<button class="btn--icon"><PlusIcon /></button>
	</div>
</div>

<BoardViewController board={board.value} />
