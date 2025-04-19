<script lang="ts">
    import {getAgent} from '../../agent/agent.svelte';
    import type {BoardTreeView, ColumnTreeView} from '../../agent/view.svelte';
    import Modal from '../components/modal.svelte';
    import TrashIcon from '../components/icons/trash-icon.svelte';
    import GripHorizontalIcon from '../components/icons/grip-horizontal-icon.svelte';
    import ColumnIcon from '../components/column-icon.svelte';
    import CircleDashedIcon from '../components/icons/circle-dashed-icon.svelte';

    let {board}: {board: BoardTreeView} = $props();

    let newColumn = $state('');

    const agent = getAgent();

    function deleteColumn(column: ColumnTreeView) {
        if (
            !confirm(
                `Are you sure you want to delete this column ${column.name}?`
            )
        ) {
            return;
        }
        agent.deleteColumn(column.id);
    }

    function onNewColumnSubmit(event: Event) {
        event.preventDefault();

        if (!newColumn) return;

        agent.createColumn({boardId: board.id, name: newColumn});
        newColumn = '';
    }
</script>

<Modal title="Manage Columns" size="md">
    <div class="flex flex-col mt-1">
        {#each board.columns as column, index (column.id)}
            <div
                class="
                  flex
                  items-center
                  px-1
                  -mx-1
                  my-1
                  focus-within:bg-surface-2
                  rounded-sm
                  group
                "
            >
                <ColumnIcon total={board.columns.length - 1} active={index} />
                <input
                    type="text"
                    class="input py-2 ml-1.5"
                    required
                    value={column.name}
                    oninput={e =>
                        agent.setColumnName(column.id, e.currentTarget.value)}
                    placeholder="Column name"
                />
                <div
                    class="
                    ml-auto
                    icon-sm
                    flex
                    items-center
                    gap-1
                    text-ink-body
                    invisible
                    group-focus-within:visible
                    group-hover:visible
                    "
                >
                    <span>
                        <GripHorizontalIcon />
                    </span>
                    <button
                        onclick={() => deleteColumn(column)}
                        class="btn--icon"
                    >
                        <TrashIcon />
                    </button>
                </div>
            </div>
            <hr class="border-dashed divider" />
        {/each}
        <form
            class="flex items-center my-1 -mx-1 px-1 focus-within:bg-surface-2 rounded-sm text-ink-detail"
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
