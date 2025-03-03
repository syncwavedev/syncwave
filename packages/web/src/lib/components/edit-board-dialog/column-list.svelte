<script lang="ts">
	import {type BoardViewColumnDto} from 'syncwave-data';
	import EditBoardDialogColumnsFrozenColumn from './edit-board-dialog-columns-frozen-column.svelte';
	import {
		dndzone,
		dragHandleZone,
		dragHandle,
		type DndEvent,
	} from 'svelte-dnd-action';
	import GripIcon from '../icons/grip-icon.svelte';
	import GripHorizontalIcon from '../icons/grip-horizontal-icon.svelte';

	const flipDurationMs = 100;
	export let handleDndConsiderColumns: (
		e: CustomEvent<DndEvent<BoardViewColumnDto>>
	) => void;
	export let handleDndFinalizeColumns: (
		e: CustomEvent<DndEvent<BoardViewColumnDto>>
	) => void;
	export let columns: BoardViewColumnDto[];
</script>

<div
	use:dragHandleZone={{
		items: columns,
		flipDurationMs,
		type: 'board-settings-columns',
		dropTargetStyle: {},
	}}
	on:consider={handleDndConsiderColumns}
	on:finalize={handleDndFinalizeColumns}
>
	{#each columns as column (column.id)}
		<div
			class="border-divider flex items-center gap-2 border-b border-dashed px-2 py-1"
		>
			<span use:dragHandle>
				<GripHorizontalIcon />
			</span>
			<EditBoardDialogColumnsFrozenColumn {column} />
		</div>
	{/each}
</div>
