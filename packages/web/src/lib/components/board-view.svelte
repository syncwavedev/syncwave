<script lang="ts">
	import {flip} from 'svelte/animate';
	import {dragHandleZone, type DndEvent} from 'svelte-dnd-action';
	import type {BoardViewColumnDto, BoardViewCardDto} from 'syncwave-data';
	import BoardViewColumn from './board-view-column.svelte';

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
		class="flex gap-4 text-sm"
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
				class="group flex w-64 flex-col"
				animate:flip={{duration: flipDurationMs}}
			>
				<BoardViewColumn
					{column}
					{handleDndConsiderCards}
					{handleDndFinalizeCards}
				/>
			</div>
		{/each}
	</div>
</div>
