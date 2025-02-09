<script lang="ts">
	import type {
		BoardViewColumnDto,
		BoardViewDto,
		BoardViewTaskDto,
		ColumnId,
	} from 'syncwave-data';
	import type {DndEvent} from 'svelte-dnd-action';
	import BoardInner from './board-inner.svelte';

	let {board}: {board: BoardViewDto} = $props();

	function orderColumns(columns: BoardViewColumnDto[]) {
		return [...columns].sort((a, b) => a.id.length - b.id.length);
	}

	let columns = $state(
		orderColumns($state.snapshot(board.columns) as BoardViewColumnDto[])
	);

	const flipDurationMs = 100;
	function handleDndConsiderColumns(
		e: CustomEvent<DndEvent<BoardViewColumnDto>>
	) {
		columns = e.detail.items;
	}
	function handleDndFinalizeColumns(
		e: CustomEvent<DndEvent<BoardViewColumnDto>>
	) {
		columns = e.detail.items;
	}
	function handleDndConsiderCards(
		column: BoardViewColumnDto,
		e: CustomEvent<DndEvent<BoardViewTaskDto>>
	) {
		column.tasks = e.detail.items;
	}
	function handleDndFinalizeCards(
		column: BoardViewColumnDto,
		e: CustomEvent<DndEvent<BoardViewTaskDto>>
	) {
		column.tasks = e.detail.items;
	}
</script>

<BoardInner
	{columns}
	{flipDurationMs}
	{handleDndConsiderCards}
	{handleDndConsiderColumns}
	{handleDndFinalizeCards}
	{handleDndFinalizeColumns}
/>
