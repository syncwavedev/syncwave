<script lang="ts">
	import EditColumnDialog from './edit-column-dialog/edit-column-dialog.svelte';
	import {usePageState} from '$lib/utils.svelte';
	import EllipsisIcon from './icons/ellipsis-icon.svelte';
	import type {ColumnView} from '$lib/agent/view.svelte';

	interface Props {
		column: ColumnView;
		class?: string;
	}

	let {column, class: className}: Props = $props();

	const editDialog = usePageState(false);
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
