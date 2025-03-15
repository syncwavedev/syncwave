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

<Scrollable
	orientation="vertical"
	viewportClass="h-full max-h-[calc(100vh-8rem)] min-h-[calc(100vh-8rem)]"
	type="scroll"
>
	<div
		class="flex w-80 flex-shrink-0 flex-col pb-1"
		data-column-id={column.id}
	>
		<div
			class="dark:bg-subtle-0 bg-subtle-1 sticky top-0 flex items-center px-2 py-1"
			data-disable-scroll-view-drag="true"
		>
			<div class="text-2xs font-medium" use:dragHandle>
				{column.column.name}
			</div>
			<button
				onclick={() => editColumnOpen.push(true)}
				class="btn--icon ml-auto"
			>
				<EllipsisIcon />
			</button>
			<EditColumnDialog
				column={column.column}
				open={editColumnOpen.value}
				onClose={() => editColumnOpen.push(false)}
			/>
			<button class="btn--icon">
				<PlusIcon />
			</button>
		</div>

		<div
			class="mx-2 flex h-full flex-col gap-1.5"
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
	</div>
</Scrollable>
