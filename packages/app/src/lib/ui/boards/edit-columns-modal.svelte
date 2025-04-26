<script lang="ts">
    import {getAgent} from '../../agent/agent.svelte';
    import type {BoardTreeView} from '../../agent/view.svelte';
    import Modal from '../components/modal.svelte';
    import CircleDashedIcon from '../components/icons/circle-dashed-icon.svelte';
    import {createDndColumnListContext} from './column-dnd';
    import EditColumnsModalColumn from './edit-columns-modal-column.svelte';

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

        agent.createColumn({boardId: board.id, name: newColumn});
        newColumn = '';
    }
</script>

<Modal title="Manage Columns" size="md">
    <div
        bind:this={columnsContainerRef}
        bind:this={viewportRef}
        class="flex flex-col modal-padding-inline mt-1 mb-2"
    >
        {#each board.columns as column, index (column.id)}
            <EditColumnsModalColumn {board} {column} {index} />
        {/each}
        <form
            class="flex items-center my-0.5 -mx-1 px-1 focus-within:bg-material-elevated-hover rounded-sm text-ink-detail"
            onsubmit={onNewColumnSubmit}
        >
            <CircleDashedIcon />
            <input
                type="text"
                class="input py-2 ml-1.5 text-ink"
                bind:value={newColumn}
                required
                placeholder="New Column"
            />
        </form>
    </div>
</Modal>
