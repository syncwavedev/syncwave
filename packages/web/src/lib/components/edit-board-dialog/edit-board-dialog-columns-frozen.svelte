<script lang="ts">
	import type {BoardViewDto} from 'syncwave-data';
	import ArrowLeftIcon from '../icons/arrow-left-icon.svelte';
	import TimesIcon from '../icons/times-icon.svelte';
	import TrashIcon from '../icons/trash-icon.svelte';
	import {BoardViewCrdt} from '$lib/crdt/board-view-crdt';
	import EditBoardDialogColumnsFrozenColumn from './edit-board-dialog-columns-frozen-column.svelte';

	interface Props {
		onClose: () => void;
		onBack: () => void;
		board: BoardViewDto;
	}

	let {onClose, onBack, board: remoteBoard}: Props = $props();

	const localBoard = new BoardViewCrdt(remoteBoard);

	let columns = $state(localBoard.snapshot().columns);
</script>

<div class="mx-4 my-2 flex items-center">
	<button onclick={onBack} class="btn--icon"><ArrowLeftIcon /></button>
	<span class="ml-1.5 text-xs font-semibold">Syncwave Columns</span>
	<button onclick={onClose} class="btn--icon ml-auto">
		<TimesIcon />
	</button>
</div>
<hr />
<div class="px-4 py-3">
	<div class="flex flex-col">
		{#each columns as column}
			<div
				class="border-divider flex items-center gap-2 border-b border-dashed px-2 py-1"
			>
				<EditBoardDialogColumnsFrozenColumn {column} />
			</div>
		{/each}

		<div class="flex items-center gap-2 p-2">
			<input
				type="text"
				placeholder="Add new column"
				class="input text-xs"
			/>
		</div>
	</div>
</div>
<hr />
<button class="btn--block mx-4 my-2 ml-auto">
	<span class="text-xs">Done</span>
</button>
