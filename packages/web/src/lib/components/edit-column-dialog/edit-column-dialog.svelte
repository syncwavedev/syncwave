<script lang="ts">
	import Dialog from '../dialog.svelte';
	import {type BoardViewColumnDto} from 'syncwave-data';
	import EditColumnDialogFrozenContent from './edit-column-dialog-content-frozen.svelte';

	interface Props {
		column: BoardViewColumnDto;
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
