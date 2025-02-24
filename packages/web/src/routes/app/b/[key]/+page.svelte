<script lang="ts">
	import {getSidebarOpen, observe, setSidebarOpen} from '$lib/utils.svelte';
	import {log} from 'syncwave-data';

	import {goto} from '$app/navigation';
	import BoardViewController from '$lib/components/board-view-controller.svelte';
	import SearchIcon from '$lib/components/icons/search-icon.svelte';
	import PlusIcon from '$lib/components/icons/plus-icon.svelte';
	import ScrollArea from '$lib/components/scroll-area.svelte';
	import {getContext} from 'svelte';
	import PanelRightIcon from '$lib/components/icons/panel-right-icon.svelte';

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

	const sidebarOpen = getSidebarOpen();
</script>

<div class="flex h-full flex-col">
	<div class="sticky top-0 z-10 shrink-0 pl-6">
		<div class="action-bar">
			{#if !sidebarOpen.value}
				<button
					class="btn--icon mr-2 -ml-2 rotate-180"
					onclick={sidebarOpen.toggle}
				>
					<PanelRightIcon />
				</button>
			{/if}
			<div class="text-xs">Syncwave Core</div>
			<button class="btn--icon ml-auto">
				<SearchIcon />
			</button>
			<button class="btn--icon"><PlusIcon /></button>
		</div>
	</div>

	<div class="min-h-0 flex-1">
		<ScrollArea draggable orientation="both" type="always" class="h-full">
			<div class=" pl-6">
				<BoardViewController board={board.value} />
			</div>
		</ScrollArea>
	</div>
</div>
