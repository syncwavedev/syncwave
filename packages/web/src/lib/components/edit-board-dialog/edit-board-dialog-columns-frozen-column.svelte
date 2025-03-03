<script lang="ts">
	import {Crdt, type BoardViewColumnDto} from 'syncwave-data';
	import TrashIcon from '../icons/trash-icon.svelte';
	import {getSdk} from '$lib/utils';

	interface Props {
		column: BoardViewColumnDto;
	}

	let {column: remoteColumn}: Props = $props();

	const localColumn = Crdt.load(remoteColumn.state);
	$effect(() => {
		localColumn.apply(remoteColumn.state);
		name = localColumn.snapshot().title;
	});

	let name = $state(remoteColumn.title);

	const sdk = getSdk();
	async function deleteColumn() {
		await sdk(x => x.deleteColumn({columnId: remoteColumn.id}));
	}

	async function updateColumnName() {
		const diff = localColumn.update(x => {
			x.title = name;
		});

		if (diff) {
			await sdk(x =>
				x.applyColumnDiff({columnId: remoteColumn.id, diff})
			);
		}
	}
</script>

<input
	type="text"
	class="input text-xs"
	required
	bind:value={name}
	oninput={updateColumnName}
	placeholder="Column name"
/>
<button onclick={deleteColumn} class="btn--icon ml-auto">
	<TrashIcon />
</button>
