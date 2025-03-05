<script lang="ts">
	import type {BoardViewColumnDto, BoardViewCardDto} from 'syncwave-data';
	import EditColumnDialog from './edit-column-dialog/edit-column-dialog.svelte';
	import {usePageState} from '$lib/utils.svelte';
	import EllipsisIcon from './icons/ellipsis-icon.svelte';

	interface Props {
		column: BoardViewColumnDto;
		class?: string;
	}

	let {column, class: className}: Props = $props();

	const editDialog = usePageState(`column-${column.id}-edit-dialog`, false);
</script>

<button onclick={() => editDialog.push(true)} class={`btn--icon ${className}`}>
	<EllipsisIcon class="pointer-events-none" />
	<!-- pointer-events-none is required because of dnd -->
</button>

<EditColumnDialog
	{column}
	open={editDialog.value}
	onClose={() => editDialog.push(false)}
/>
