<script lang="ts">
    import Dialog from '../dialog.svelte';
    import EditColumnDialogFrozenContent from './edit-column-dialog-content-frozen.svelte';
    import type {ColumnView} from '../../agent/view.svelte';

    interface Props {
        column: ColumnView;
        open: boolean;
        onClose: () => void;
    }

    let {column, open, onClose}: Props = $props();
</script>

<Dialog {open} {onClose}>
    {#key column.id}
        <EditColumnDialogFrozenContent {column} {onClose} />
    {/key}
</Dialog>
