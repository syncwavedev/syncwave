<script lang="ts">
	import ColumnList from './column-list.svelte';
	import {useBoardView} from '../../ui/boards/use-board-view.svelte';
	import {BoardTreeView} from '../../agent/view.svelte';

	let {board}: {board: BoardTreeView} = $props();

	const {columns, handleDndConsiderColumns, handleDndFinalizeColumns} =
		useBoardView({value: board});
</script>

<ColumnList
	columns={columns.value}
	{handleDndConsiderColumns}
	{handleDndFinalizeColumns}
/>
