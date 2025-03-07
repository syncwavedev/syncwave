<script lang="ts">
	import type {BoardViewColumnDto} from 'syncwave-data';
	import CardTile from './card-tile.svelte';

	let {column}: {column: BoardViewColumnDto} = $props();
</script>

<div class="w-76 flex-shrink-0">
	<div class="text-3xs mb-2 uppercase">{column.name}</div>
	<div class="flex flex-col gap-2">
		{#each column.cards as card (card.id)}
			<div data-disable-scroll-view-drag="true">
				<CardTile {card} />
			</div>
		{/each}
	</div>
</div>
