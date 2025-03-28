<script lang="ts">
	import {createColumnId, toPosition} from 'syncwave';
	import ArrowLeftIcon from '../icons/arrow-left-icon.svelte';
	import TimesIcon from '../icons/times-icon.svelte';
	import {getRpc} from '../../utils';
	import ColumnListController from './column-list-controller.svelte';
	import type {BoardTreeView} from '../../agent/view.svelte';

	interface Props {
		onClose: () => void;
		onBack: () => void;
		board: BoardTreeView;
	}

	let {onClose, onBack, board}: Props = $props();

	let newColumnName = $state('');

	const rpc = getRpc();
	async function addColumn(e: Event) {
		e.preventDefault();

		await rpc(x =>
			x.createColumn({
				boardId: board.id,
				name: newColumnName,
				columnId: createColumnId(),
				position: toPosition({
					prev: board.columns.at(-1)?.position,
					next: undefined,
				}),
			})
		);
		newColumnName = '';
	}
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
		<ColumnListController {board} />

		<form onsubmit={addColumn} class="flex items-center gap-2 p-2">
			<input
				type="text"
				bind:value={newColumnName}
				placeholder="Add new column"
				class="input text-xs"
			/>
		</form>
	</div>
</div>
<hr />
<button onclick={onClose} class="btn--block mx-4 my-2 ml-auto">
	<span class="text-xs">Done</span>
</button>
