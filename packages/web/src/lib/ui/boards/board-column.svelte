<script lang="ts">
	import CardTile from './card-tile.svelte';
	import {dndzone, dragHandle, type DndEvent} from 'svelte-dnd-action';
	import Scrollable from '../components/scrollable.svelte';
	import type {DndCard, DndColumn} from './use-board-view.svelte';
	import type {CardView} from '$lib/sdk/view.svelte';

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
</script>

<div class="bg-subtle-2 flex w-80 flex-shrink-0 flex-col rounded-md p-2">
	<div
		class="text-2xs mb-1 font-medium"
		use:dragHandle
		data-disable-scroll-view-drag="true"
	>
		{column.column.name}
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
