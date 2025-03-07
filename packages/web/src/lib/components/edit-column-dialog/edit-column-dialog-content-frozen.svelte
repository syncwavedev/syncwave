<script lang="ts">
	import TimesIcon from '../icons/times-icon.svelte';
	import {Crdt, type BoardViewColumnDto} from 'syncwave-data';
	import {getSdk} from '$lib/utils';
	import TrashIcon from '../icons/trash-icon.svelte';

	interface Props {
		column: BoardViewColumnDto;
		onClose: () => void;
	}

	let {column: remoteColumn, onClose}: Props = $props();

	const sdk = getSdk();

	const localColumn = Crdt.load(remoteColumn.state);
	$effect(() => {
		localColumn.apply(remoteColumn.state);
		name = localColumn.snapshot().name;
	});

	let name = $state(localColumn.snapshot().name);

	async function updateColumnName() {
		localColumn.update(x => {
			x.name = name;
		});

		await sdk(x =>
			x.applyColumnDiff({
				columnId: remoteColumn.id,
				diff: localColumn.state(),
			})
		);
	}

	async function deleteColumn() {
		if (!confirm(`Are you sure you want to delete ${name} column?`)) return;

		await sdk(x => x.deleteColumn({columnId: remoteColumn.id}));
		onClose();
	}
</script>

<div class="mx-4 my-2 flex items-center">
	<span class="text-xs font-semibold">Column Settings</span>
	<button onclick={onClose} class="btn--icon ml-auto">
		<TimesIcon />
	</button>
</div>
<hr />
<div class="mx-4 mt-4 flex flex-col gap-1">
	<label for="name" class="text-xs">Column Name</label>
	<!-- svelte-ignore a11y_autofocus -->
	<input
		type="text"
		id="name"
		bind:value={name}
		autofocus
		onkeydown={e => e.key === 'Enter' && onClose()}
		oninput={updateColumnName}
		class="input input--bordered text-xs"
		placeholder="Name"
	/>
</div>
<hr />
<button onclick={deleteColumn} class="btn--block mx-auto my-2">
	<TrashIcon />
	<span class="ml-1.5 text-xs">Delete Column</span>
</button>
