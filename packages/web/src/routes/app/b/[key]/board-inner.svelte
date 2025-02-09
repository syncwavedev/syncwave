<script lang="ts">
	import {flip} from 'svelte/animate';
	import {dndzone, type DndEvent} from 'svelte-dnd-action';
	import type {
		BoardViewColumnDto,
		BoardViewDto,
		BoardViewTaskDto,
		ColumnId,
	} from 'syncwave-data';

	export let flipDurationMs: number;
	export let handleDndConsiderColumns: (
		e: CustomEvent<DndEvent<BoardViewColumnDto>>
	) => void;
	export let handleDndFinalizeColumns: (
		e: CustomEvent<DndEvent<BoardViewColumnDto>>
	) => void;
	export let handleDndConsiderCards: (
		column: BoardViewColumnDto,
		e: CustomEvent<DndEvent<BoardViewTaskDto>>
	) => void;
	export let handleDndFinalizeCards: (
		column: BoardViewColumnDto,
		e: CustomEvent<DndEvent<BoardViewTaskDto>>
	) => void;

	export let columns: BoardViewColumnDto[];
</script>

<section
	class="board"
	use:dndzone={{
		items: columns,
		flipDurationMs,
		type: 'columns',
	}}
	on:consider={handleDndConsiderColumns}
	on:finalize={handleDndFinalizeColumns}
>
	{#each columns as column (column.id)}
		<div class="column" animate:flip={{duration: flipDurationMs}}>
			<div class="column-title">{column.title}</div>
			<div
				class="column-content"
				use:dndzone={{
					items: column.tasks,
					flipDurationMs,
					type: 'cards',
				}}
				on:consider={e => handleDndConsiderCards(column, e)}
				on:finalize={e => handleDndFinalizeCards(column, e)}
			>
				{#each column.tasks as task (task.id)}
					<div class="card" animate:flip={{duration: flipDurationMs}}>
						{task.title}
					</div>
				{/each}
			</div>
		</div>
	{/each}
</section>

<style>
	.board {
		height: 90vh;
		width: 100%;
		padding: 0.5em;
		margin-bottom: 40px;
	}
	.column {
		height: 100%;
		width: 250px;
		padding: 0.5em;
		background-color: white;
		margin: 1em;
		float: left;
		display: flex;
		flex-direction: column;
		border: 1px solid #333333;
		/*Notice we make sure this container doesn't scroll so that the title stays on top and the dndzone inside is scrollable*/
		overflow-y: hidden;
	}
	.column-content {
		min-height: 0;
		flex: 1;
		/* Notice that the scroll container needs to be the dndzone if you want dragging near the edge to trigger scrolling */
		overflow-y: scroll;
	}
	.column-title {
		margin-bottom: 1em;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.card {
		height: 15%;
		width: 100%;
		margin: 0.4em 0;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: #dddddd;
		border: 1px solid #333333;
	}
</style>
