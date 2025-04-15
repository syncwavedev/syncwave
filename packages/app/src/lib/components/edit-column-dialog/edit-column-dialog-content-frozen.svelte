<script lang="ts">
    import TimesIcon from '../icons/times-icon.svelte';
    import TrashIcon from '../icons/trash-icon.svelte';
    import type {ColumnView} from '../../agent/view.svelte';
    import {getAgent} from '../../agent/agent.svelte';

    interface Props {
        column: ColumnView;
        onClose: () => void;
    }

    let {column, onClose}: Props = $props();

    const agent = getAgent();

    async function deleteColumn() {
        if (!confirm(`Are you sure you want to delete ${name} column?`)) return;

        agent.deleteColumn(column.id);
        onClose();
    }
</script>

<div class="mx-4 my-2 flex items-center">
    <span class="text-xs font-semibold">Column Settings</span>
    <button onclick={onClose} class="btn--icon ml-auto">
        <TimesIcon />
    </button>
</div>
<hr />
<div class="mx-4 mt-4 flex flex-col gap-1">
    <label for="name" class="text-xs">Column Name</label>
    <!-- svelte-ignore a11y_autofocus -->
    <input
        type="text"
        id="name"
        value={column.name}
        autofocus
        onkeydown={e => e.key === 'Enter' && onClose()}
        oninput={e => agent.setColumnName(column.id, e.currentTarget.value)}
        class="input input--bordered text-xs"
        placeholder="Name"
    />
</div>
<hr />
<button onclick={deleteColumn} class="btn--block mx-auto my-2">
    <TrashIcon />
    <span class="ml-1.5 text-xs">Delete Column</span>
</button>
