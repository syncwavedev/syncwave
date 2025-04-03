<script lang="ts">
    import type {UserId} from 'syncwave';
    import type {BoardTreeView} from '../../agent/view.svelte';
    import Dialog from '../dialog.svelte';
    import EditBoardDialogFrozenContent from './edit-board-dialog-content-frozen.svelte';

    interface Props {
        board: BoardTreeView;
        meId: UserId;
        open: boolean;
        onClose: () => void;
    }

    let {board, open, onClose, meId}: Props = $props();
</script>

<Dialog {open} {onClose}>
    {#key board.id}
        <EditBoardDialogFrozenContent {meId} {board} {onClose} />
    {/key}
</Dialog>
