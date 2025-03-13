<script lang="ts">
	import type {BoardTreeView} from '$lib/agent/view.svelte';
	import Dialog from '../dialog.svelte';
	import EditBoardDialogFrozenContent from './edit-board-dialog-content-frozen.svelte';

	interface Props {
		board: BoardTreeView;
		open: boolean;
		onClose: () => void;
	}

	let {board, open, onClose}: Props = $props();
</script>

<Dialog {open} {onClose}>
	{#key board.id}
		<EditBoardDialogFrozenContent {board} {onClose} />
	{/key}
</Dialog>
