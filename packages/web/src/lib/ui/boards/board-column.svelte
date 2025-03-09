<script lang="ts">
	import type {BoardViewCardDto, BoardViewColumnDto} from 'syncwave-data';
	import CardTile from './card-tile.svelte';

	const {
		column,
		onCardClick,
	}: {
		column: BoardViewColumnDto;
		onCardClick: (card: BoardViewCardDto) => void;
	} = $props();
</script>

<div class="w-76 flex-shrink-0">
	<div class="text-3xs mb-2 uppercase">{column.name}</div>
	<div class="flex flex-col gap-2">
		{#each column.cards as card (card.id)}
			<div data-disable-scroll-view-drag="true">
				<CardTile {card} onClick={() => onCardClick(card)} />
			</div>
		{/each}
	</div>
</div>
