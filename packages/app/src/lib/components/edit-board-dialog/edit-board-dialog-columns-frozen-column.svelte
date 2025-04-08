<script lang="ts">
    import TrashIcon from '../icons/trash-icon.svelte';
    import {ColumnView} from '../../agent/view.svelte';
    import {getAgent} from '../../agent/agent';
    import type {ColumnId} from 'syncwave';

    interface Props {
        column: ColumnView;
    }

    let {column}: Props = $props();

    const agent = getAgent();

    function deleteColumn(columnId: ColumnId) {
        if (
            !confirm(
                `Are you sure you want to delete this column ${column.name}?`
            )
        ) {
            return;
        }
        agent.deleteColumn(columnId);
    }
</script>

<input
    type="text"
    class="input text-xs"
    required
    value={column.name}
    oninput={e => agent.setColumnName(column.id, e.currentTarget.value)}
    placeholder="Column name"
/>
<button onclick={() => deleteColumn(column.id)} class="btn--icon ml-auto">
    <TrashIcon />
</button>
