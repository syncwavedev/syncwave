<script lang="ts">
	import Dialog from '../dialog.svelte';
	import {type BoardViewDto} from 'syncwave-data';
	import EditBoardDialogFrozenContent from './edit-board-dialog-content-frozen.svelte';

	interface Props {
		board: BoardViewDto;
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
