<script lang="ts">
	import {observe} from '$lib/utils.svelte';
	import {log} from 'syncwave-data';

	import {goto} from '$app/navigation';
	import BoardViewController from '$lib/components/board-view-controller.svelte';
	import SearchIcon from '$lib/components/icons/search-icon.svelte';
	import PlusIcon from '$lib/components/icons/plus-icon.svelte';
	import ScrollArea from '$lib/components/scroll-area.svelte';
	import {getContext} from 'svelte';
	import PanelRightIcon from '$lib/components/icons/panel-right-icon.svelte';
	import EllipsisIcon from '$lib/components/icons/ellipsis-icon.svelte';
	import type {LayoutProps} from './$types';

	const {data, children}: LayoutProps = $props();
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

<div class="flex h-full">
	<div class="flex h-full min-w-0 flex-1 flex-col">
		<div class="sticky top-0 z-10 shrink-0 px-6">
			<div class="bg-subtle-1 dark:bg-subtle-0 sticky top-0 z-10">
				<div class="my-2 flex items-center">
					<div class="text-xs leading-none font-semibold">
						Syncwave Core
					</div>

					<button class="btn--icon ml-auto">
						<PlusIcon />
					</button>
					<button class="btn--icon"><SearchIcon /></button>
					<button class="btn--icon -mr-2"><EllipsisIcon /></button>
				</div>
			</div>
		</div>

		<div class="min-h-0 flex-1">
			<ScrollArea
				draggable
				orientation="both"
				type="always"
				class="h-full"
			>
				<div class="pl-6">
					<BoardViewController board={board.value} />
				</div>
			</ScrollArea>
		</div>
	</div>
	<div
		class="border-divider bg-subtle-0 dark:bg-subtle-1 z-10 flex h-full w-112 min-w-84 flex-shrink-0 flex-col border-l"
	>
		{@render children()}
	</div>
</div>
