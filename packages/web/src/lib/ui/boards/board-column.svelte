<script lang="ts">
	import CardTile from './card-tile.svelte';
	import {dndzone, dragHandle, type DndEvent} from 'svelte-dnd-action';
	import Scrollable from '../components/scrollable.svelte';
	import type {DndCard, DndColumn} from './use-board-view.svelte';
	import type {CardView} from '$lib/agent/view.svelte';
	import PlusIcon from '../components/icons/plus-icon.svelte';
	import EllipsisIcon from '$lib/components/icons/ellipsis-icon.svelte';
	import {usePageState} from '$lib/utils.svelte';
	import EditColumnDialog from '$lib/components/edit-column-dialog/edit-column-dialog.svelte';
	import {createUuidV4} from 'syncwave-data';

	const {
		column,
		onCardClick,
		handleCardDnd,
		activeCardId,
	}: {
		column: DndColumn;
		onCardClick: (card: CardView) => void;
		handleCardDnd: (e: CustomEvent<DndEvent<DndCard>>) => void;
		activeCardId?: string;
	} = $props();

	const editColumnOpen = usePageState(false);
</script>

<div
	class="bg-subtle-2 dark:bg-subtle-1 group flex w-80 flex-shrink-0 flex-col rounded-md p-2"
>
	<div class="mb-1 flex items-center">
		<div
			class="text-2xs font-medium"
			use:dragHandle
			data-disable-scroll-view-drag="true"
		>
			{column.column.name}
		</div>
		<button
			onclick={() => editColumnOpen.push(true)}
			class="btn--icon invisible ml-auto group-hover:visible"
		>
			<EllipsisIcon />
		</button>
		<EditColumnDialog
			column={column.column}
			open={editColumnOpen.value}
			onClose={() => editColumnOpen.push(false)}
		/>
		<button class="btn--icon invisible group-hover:visible">
			<PlusIcon />
		</button>
	</div>
	<Scrollable
		orientation="vertical"
		viewportClass="h-full max-h-[calc(100vh-8rem)] min-h-[calc(100vh-8rem)]"
		type="scroll"
	>
		<div
			class="flex h-full flex-col gap-1.5"
			use:dndzone={{
				items: column.cards,
				flipDurationMs: 100,
				type: 'cards',
				dropTargetStyle: {},
			}}
			onconsider={handleCardDnd}
			onfinalize={handleCardDnd}
		>
			{#each column.cards as card (card.id)}
				<div data-disable-scroll-view-drag="true">
					<CardTile
						card={card.card}
						onClick={() => onCardClick(card.card)}
						active={card.id === activeCardId}
					/>
				</div>
			{/each}
		</div>
	</Scrollable>
</div>
