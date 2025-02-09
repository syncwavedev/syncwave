<script lang="ts">
	import {flip} from 'svelte/animate';
	import {dndzone} from 'svelte-dnd-action';
	const flipDurationMs = 100;
	function handleDndConsiderColumns(e: any) {
		columnItems = e.detail.items;
	}
	function handleDndFinalizeColumns(e: any) {
		columnItems = e.detail.items;
	}
	function handleDndConsiderCards(cid: any, e: any) {
		const colIdx = columnItems.findIndex((c: any) => c.id === cid);
		columnItems[colIdx].items = e.detail.items;
		columnItems = [...columnItems];
	}
	function handleDndFinalizeCards(cid: any, e: any) {
		const colIdx = columnItems.findIndex((c: any) => c.id === cid);
		columnItems[colIdx].items = e.detail.items;
		columnItems = [...columnItems];
	}

	let columnItems = [
		{
			id: 41,
			name: 'TODO',
			items: [
				{id: 41, name: 'item41'},
				{id: 42, name: 'item42'},
				{id: 43, name: 'item43'},
				{id: 44, name: 'item44'},
				{id: 45, name: 'item45'},
				{id: 46, name: 'item46'},
				{id: 47, name: 'item47'},
				{id: 48, name: 'item48'},
				{id: 49, name: 'item49'},
			],
		},
		{
			id: 42,
			name: 'DOING',
			items: [],
		},
		{
			id: 43,
			name: 'DONE',
			items: [],
		},
	];
</script>

<section
	class="board"
	use:dndzone={{
		items: columnItems,
		flipDurationMs,
		type: 'columns',
	}}
	on:consider={handleDndConsiderColumns}
	on:finalize={handleDndFinalizeColumns}
>
	{#each columnItems as column (column.id)}
		<div class="column" animate:flip={{duration: flipDurationMs}}>
			<div class="column-title">{column.name}</div>
			<div
				class="column-content"
				use:dndzone={{
					items: column.items,
					flipDurationMs,
					type: 'cards',
				}}
				on:consider={e => handleDndConsiderCards(column.id, e)}
				on:finalize={e => handleDndFinalizeCards(column.id, e)}
			>
				{#each column.items as item (item.id)}
					<div class="card" animate:flip={{duration: flipDurationMs}}>
						{item.name}
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
