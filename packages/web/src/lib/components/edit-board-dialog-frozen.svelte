<script lang="ts">
	import {getSdk} from '$lib/utils';
	import Dialog from './dialog.svelte';
	import TrashIcon from './icons/trash-icon.svelte';
	import TimesIcon from './icons/times-icon.svelte';
	import ChevronIcon from './icons/chevron-icon.svelte';
	import {Crdt, type BoardDto, type BoardViewDto} from 'syncwave-data';

	interface Props {
		board: BoardViewDto;
		open: boolean;
		onClose: () => void;
	}

	let {board: remoteBoard, open, onClose}: Props = $props();

	const sdk = getSdk();

	const localBoard = Crdt.load(remoteBoard.state);
	$effect(() => {
		localBoard.apply(remoteBoard.state);
		name = localBoard.snapshot().name;
	});

	let name = $state(localBoard.snapshot().name);

	async function updateBoardName() {
		const diff = localBoard.update(x => {
			x.name = name;
		});

		if (diff) {
			await sdk(x =>
				x.applyBoardDiff({
					boardId: remoteBoard.id,
					diff,
				})
			);
		}
	}
</script>

<svelte:body onkeydown={e => e.key === 'Escape' && onClose()} />

<Dialog {open} {onClose}>
	<div class="mx-4 my-2 flex items-center">
		<span class="text-xs font-semibold">Board Settings</span>
		<button onclick={onClose} class="btn--icon ml-auto">
			<TimesIcon />
		</button>
	</div>
	<hr />
	<div class="mx-4 mt-4 flex flex-col gap-1">
		<label for="name" class="text-xs">Board Name</label>
		<input
			type="text"
			id="name"
			bind:value={name}
			oninput={updateBoardName}
			class="input input--bordered text-xs"
			placeholder="Name"
		/>
	</div>
	<div class="mx-4 my-4 flex flex-col gap-1">
		<label for="key" class="text-xs"> Board Key </label>
		<input
			disabled
			type="text"
			id="name"
			class="input input--bordered text-xs"
			placeholder="Name"
			value="SYNC"
		/>
	</div>
	<hr />
	<div class="hover:bg-subtle-1 flex cursor-pointer items-center gap-2 p-4">
		<span class="text-xs">4 Members</span>
		<span class="text-ink-body ml-auto flex items-center gap-1.5">
			<span class="text-xs">View members</span>
			<ChevronIcon />
		</span>
	</div>
	<hr />
	<div class="hover:bg-subtle-1 flex cursor-pointer items-center gap-2 p-4">
		<span class="text-xs">6 Columns</span>
		<span class="text-ink-body ml-auto flex items-center gap-1.5">
			<span class="text-xs">Edit columns</span>
			<ChevronIcon />
		</span>
	</div>
	<hr />
	<button class="btn--block mx-auto my-2">
		<TrashIcon />
		<span class="ml-1.5 text-xs">Delete Syncwave</span>
	</button>
</Dialog>
