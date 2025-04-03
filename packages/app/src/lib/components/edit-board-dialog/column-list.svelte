<script lang="ts">
    import EditBoardDialogColumnsFrozenColumn from './edit-board-dialog-columns-frozen-column.svelte';
    import {dragHandleZone, dragHandle, type DndEvent} from 'svelte-dnd-action';
    import GripHorizontalIcon from '../icons/grip-horizontal-icon.svelte';
    import type {DndColumn} from '../../ui/boards/use-board-view.svelte';

    const flipDurationMs = 100;
    export let handleDndConsiderColumns: (
        e: CustomEvent<DndEvent<DndColumn>>
    ) => void;
    export let handleDndFinalizeColumns: (
        e: CustomEvent<DndEvent<DndColumn>>
    ) => void;
    export let columns: DndColumn[];
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
            <EditBoardDialogColumnsFrozenColumn column={column.column} />
        </div>
    {/each}
</div>
