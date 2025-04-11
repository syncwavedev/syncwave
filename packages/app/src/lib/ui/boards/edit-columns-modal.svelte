<script lang="ts">
    import {getAgent} from '../../agent/agent';
    import type {ColumnTreeView} from '../../agent/view.svelte';
    import Modal from '../components/modal.svelte';
    import TrashIcon from '../components/icons/trash-icon.svelte';
    import GripHorizontalIcon from '../components/icons/grip-horizontal-icon.svelte';
    import ColumnIcon from '../components/column-icon.svelte';
    import CircleDashedIcon from '../components/icons/circle-dashed-icon.svelte';

    const {
        columns,
    }: {
        columns: ColumnTreeView[];
    } = $props();

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
</script>

<Modal title="Manage Columns" size="md">
    <div class="flex flex-col mx-4 my-1">
        {#each columns as column, index (column.id)}
            <div
                class="flex items-center -mx-1 px-1 my-0.5 focus-within:bg-surface-3 rounded-sm group"
            >
                <ColumnIcon total={columns.length - 1} active={index} />
                <input
                    type="text"
                    class="input py-2 ml-1.5"
                    required
                    value={column.name}
                    oninput={e =>
                        agent.setColumnName(column.id, e.currentTarget.value)}
                    placeholder="Column name"
                />
                <span
                    class="text-ink-body ml-auto mr-1 invisible group-focus-within:visible group-hover:visible"
                >
                    <GripHorizontalIcon />
                </span>
                <button
                    onclick={() => deleteColumn(column)}
                    class="btn--icon invisible group-focus-within:visible group-hover:visible"
                >
                    <TrashIcon />
                </button>
            </div>
            <hr />
        {/each}
        <div
            class="flex items-center my-0.5 -mx-1 px-1 focus-within:bg-surface-3 rounded-sm"
        >
            <div class="text-ink-detail"><CircleDashedIcon /></div>
            <input
                type="text"
                class="input py-2 ml-1.5"
                bind:value={newColumn}
                required
                placeholder="New Column"
            />
        </div>
    </div>
</Modal>
