<script lang="ts">
	import type {BoardViewColumnDto, BoardViewCardDto} from 'syncwave-data';
	import EditColumnDialog from './edit-column-dialog/edit-column-dialog.svelte';
	import {toggle} from '$lib/utils.svelte';
	import EllipsisIcon from './icons/ellipsis-icon.svelte';

	interface Props {
		column: BoardViewColumnDto;
		class?: string;
	}

	let {column, class: className}: Props = $props();

	const editDialog = toggle();
</script>

<button onclick={editDialog.on} class={`btn--icon ${className}`}>
	<EllipsisIcon class="pointer-events-none" />
	<!-- pointer-events-none is required because of dnd -->
</button>

<EditColumnDialog {column} open={editDialog.value} onClose={editDialog.off} />
