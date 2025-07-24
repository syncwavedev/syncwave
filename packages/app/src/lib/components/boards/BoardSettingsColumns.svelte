<script lang="ts">
    import {getAgent} from '../../agent/agent.svelte';
    import type {BoardTreeView} from '../../agent/view.svelte';
    import CircleDashedIcon from '../icons/CircleDashedIcon.svelte';
    import {createDndColumnListContext} from '../../dnd/column-dnd';
    import BoardSettingColumnEdit from './BoardSettingColumnEdit.svelte';

    let {board}: {board: BoardTreeView} = $props();

    let newColumn = $state('');

    const agent = getAgent();

    let columnsContainerRef: HTMLDivElement | null = $state(null);
    let viewportRef: HTMLDivElement | null = $state(null);

    const dndContext = createDndColumnListContext(agent);

    $effect(() => {
        if (columnsContainerRef && viewportRef) {
            return dndContext.registerColumnList(
                columnsContainerRef,
                viewportRef
            );
        }

        return undefined;
    });

    function onNewColumnSubmit(event: Event) {
        event.preventDefault();

        if (!newColumn) return;

        agent.createColumn({
            boardId: board.id,
            name: newColumn,
            placement: {
                prev: board.columns[board.columns.length - 1].position,
            },
        });
        newColumn = '';
    }
</script>

<div class="modal-padding-inline">
    <div class="flex flex-col gap-1 flex-1 mb-2 mt-6">
        <p class="font-semibold">Manage columns</p>
        <p class="font-detail text-ink-detail text-sm">
            Add, edit, or reorder columns to organize your board layout
        </p>
    </div>
    <div
        bind:this={columnsContainerRef}
        bind:this={viewportRef}
        class="flex flex-col mb-8"
    >
        {#each board.columns as column (column.id)}
            <BoardSettingColumnEdit {column} />
        {/each}
        <form
            class="flex items-center my-0.5 -mx-1 px-1 focus-within:bg-material-elevated-hover rounded-sm text-ink-detail"
            onsubmit={onNewColumnSubmit}
        >
            <CircleDashedIcon />
            <input
                type="text"
                class="input py-2 ml-1.5 flex-1 input--no-focus"
                bind:value={newColumn}
                required
                placeholder="New Column"
            />
        </form>
    </div>
</div>
