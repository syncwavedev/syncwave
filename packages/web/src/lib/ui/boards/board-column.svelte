<script lang="ts">
	import type {BoardViewCardDto, BoardViewColumnDto} from 'syncwave-data';
	import CardTile from './card-tile.svelte';
	import {dndzone, dragHandle, type DndEvent} from 'svelte-dnd-action';
	import Scrollable from '../components/scrollable.svelte';

	const {
		column,
		onCardClick,
		handleCardDnd,
	}: {
		column: BoardViewColumnDto;
		onCardClick: (card: BoardViewCardDto) => void;
		handleCardDnd: (e: CustomEvent<DndEvent<BoardViewCardDto>>) => void;
	} = $props();

	let hasBottomScroll = $state(false);
	let hasTopScroll = $state(false);
</script>

<div class="flex w-76 flex-shrink-0 flex-col">
	<div
		class="text-3xs mb-2 uppercase"
		use:dragHandle
		data-disable-scroll-view-drag="true"
	>
		{column.name}
	</div>
	<Scrollable
		orientation="vertical"
		viewportClass="h-full max-h-[calc(100vh-7rem)]"
		type="hover"
		bind:hasTopScroll
		bind:hasBottomScroll
	>
		{#if hasTopScroll}
			<div
				class="from-subtle-0 absolute top-0 h-16 w-full bg-gradient-to-b to-transparent"
			></div>
		{/if}
		<div
			class="flex flex-col gap-2"
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
		{#if hasBottomScroll}
			<div
				class="from-subtle-0 absolute bottom-0 h-16 w-full bg-gradient-to-t to-transparent"
			></div>
		{/if}
	</Scrollable>
</div>
