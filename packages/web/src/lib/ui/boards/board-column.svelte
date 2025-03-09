<script lang="ts">
	import type {BoardViewCardDto, BoardViewColumnDto} from 'syncwave-data';
	import CardTile from './card-tile.svelte';
	import {dndzone, dragHandle, type DndEvent} from 'svelte-dnd-action';

	const {
		column,
		onCardClick,
		handleCardDnd,
	}: {
		column: BoardViewColumnDto;
		onCardClick: (card: BoardViewCardDto) => void;
		handleCardDnd: (e: CustomEvent<DndEvent<BoardViewCardDto>>) => void;
	} = $props();
</script>

<div class="flex w-76 flex-shrink-0 flex-col">
	<div
		class="text-3xs mb-2 uppercase"
		use:dragHandle
		data-disable-scroll-view-drag="true"
	>
		{column.name}
	</div>
	<div
		class="flex flex-1 flex-col gap-2"
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
				<CardTile {card} onClick={() => onCardClick(card)} />
			</div>
		{/each}
	</div>
</div>
