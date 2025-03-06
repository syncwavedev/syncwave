<script lang="ts">
	import {flip} from 'svelte/animate';
	import {dragHandle, dndzone, type DndEvent} from 'svelte-dnd-action';
	import type {BoardViewColumnDto, BoardViewCardDto} from 'syncwave-data';
	import CardTile from './card-tile.svelte';
	import BoardViewColumnEditButton from './board-view-column-edit-button.svelte';

	const flipDurationMs = 100;
	export let handleDndConsiderCards: (
		column: BoardViewColumnDto,
		e: CustomEvent<DndEvent<BoardViewCardDto>>
	) => void;
	export let handleDndFinalizeCards: (
		column: BoardViewColumnDto,
		e: CustomEvent<DndEvent<BoardViewCardDto>>
	) => void;

	export let column: BoardViewColumnDto;
</script>

<div class="group">
	<div
		use:dragHandle
		data-disable-scroll-view-drag="true"
		class="text-ink-body text-2xs mb-2 flex items-center gap-2"
	>
		<span>{column.name}</span>
		<BoardViewColumnEditButton
			class="invisible group-hover:visible"
			{column}
		/>
	</div>
	<div
		class="dnd-column flex flex-1 flex-col gap-2 pb-40"
		use:dndzone={{
			items: column.cards,
			flipDurationMs,
			type: 'cards',
			dropTargetStyle: {},
		}}
		on:consider={e => handleDndConsiderCards(column, e)}
		on:finalize={e => handleDndFinalizeCards(column, e)}
	>
		{#each column.cards as card (card.id)}
			<div
				data-disable-scroll-view-drag="true"
				animate:flip={{duration: flipDurationMs}}
			>
				<div class="inner-card">
					<CardTile {card} />
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	:global {
		.dnd-column *[data-is-dnd-shadow-item-internal='true'] {
			visibility: visible !important;
			background: #eee;
			border-radius: 10px;

			.inner-card {
				visibility: hidden;
			}
		}
	}
</style>
