<script lang="ts">
	import {flip} from 'svelte/animate';
	import {
		dragHandleZone,
		dragHandle,
		dndzone,
		type DndEvent,
	} from 'svelte-dnd-action';
	import type {BoardViewColumnDto, BoardViewCardDto} from 'syncwave-data';
	import CardTile from './card-tile.svelte';

	const flipDurationMs = 100;
	export let handleDndConsiderColumns: (
		e: CustomEvent<DndEvent<BoardViewColumnDto>>
	) => void;
	export let handleDndFinalizeColumns: (
		e: CustomEvent<DndEvent<BoardViewColumnDto>>
	) => void;
	export let handleDndConsiderCards: (
		column: BoardViewColumnDto,
		e: CustomEvent<DndEvent<BoardViewCardDto>>
	) => void;
	export let handleDndFinalizeCards: (
		column: BoardViewColumnDto,
		e: CustomEvent<DndEvent<BoardViewCardDto>>
	) => void;

	export let columns: BoardViewColumnDto[];
</script>

<div class="mt-2 flex-1">
	<div
		class="flex gap-6 text-sm"
		use:dragHandleZone={{
			items: columns,
			flipDurationMs,
			type: 'columns',
			dropTargetStyle: {},
		}}
		on:consider={handleDndConsiderColumns}
		on:finalize={handleDndFinalizeColumns}
	>
		{#each columns as column (column.id)}
			<div
				class="flex w-64 flex-col"
				animate:flip={{duration: flipDurationMs}}
			>
				<div
					use:dragHandle
					class="text-ink-body text-2xs sticky top-0 mb-2 bg-white"
				>
					{column.title}
				</div>
				<div
					class="flex flex-1 flex-col gap-2 pb-40"
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
						<div animate:flip={{duration: flipDurationMs}}>
							<CardTile {card} />
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
