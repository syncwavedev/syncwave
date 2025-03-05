<script lang="ts">
	import TimesIcon from '../icons/times-icon.svelte';
	import {Crdt, type BoardViewDto} from 'syncwave-data';
	import {getSdk} from '$lib/utils';
	import ChevronIcon from '../icons/chevron-icon.svelte';
	import TrashIcon from '../icons/trash-icon.svelte';

	interface Props {
		board: BoardViewDto;
		onClose: () => void;
		onMembers: () => void;
		onColumns: () => void;
	}

	let {board: remoteBoard, onMembers, onColumns, onClose}: Props = $props();

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

	async function deleteBoard() {
		if (!confirm(`Are you sure you want to delete ${name} board?`)) return;

		await sdk(x => x.deleteBoard({boardId: remoteBoard.id}));
		onClose();
	}
</script>

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
		title="Board key cannot be changed"
		type="text"
		id="name"
		class="input input--bordered cursor-not-allowed text-xs"
		placeholder="Name"
		value={remoteBoard.key}
	/>
</div>
<hr />
<button
	onclick={onMembers}
	class="hover:bg-subtle-1 flex w-full cursor-pointer items-center gap-2 p-4"
>
	<span class="text-xs">4 Members</span>
	<span class="text-ink-body ml-auto flex items-center gap-1.5">
		<span class="text-xs">View members</span>
		<ChevronIcon />
	</span>
</button>
<hr />
<button
	onclick={onColumns}
	class="hover:bg-subtle-1 flex w-full cursor-pointer items-center gap-2 p-4"
>
	<span class="text-xs">6 Columns</span>
	<span class="text-ink-body ml-auto flex items-center gap-1.5">
		<span class="text-xs">Edit columns</span>
		<ChevronIcon />
	</span>
</button>
<hr />
<button onclick={deleteBoard} class="btn--block mx-auto my-2">
	<TrashIcon />
	<span class="ml-1.5 text-xs">Delete {name}</span>
</button>
