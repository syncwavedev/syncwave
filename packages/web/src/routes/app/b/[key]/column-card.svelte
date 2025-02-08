<script lang="ts">
	import {Button} from '$lib/components/ui/button';
	import {getSdk} from '$lib/utils';
	import {Edit, Trash} from 'lucide-svelte';
	import {
		assert,
		type Column,
		type ColumnDto,
		type ColumnId,
	} from 'syncwave-data';
	import EditColumnDialog from './edit-column-dialog.svelte';
	import {toggle} from '$lib/utils.svelte';

	let {column}: {column: ColumnDto} = $props();

	const sdk = getSdk();

	async function deleteColumn(columnId: ColumnId) {
		await sdk(rpc => rpc.deleteColumn({columnId}));
	}

	let editOpen = toggle();
</script>

<div class="flex items-center gap-2">
	<Button onclick={() => deleteColumn(column.id)} variant="ghost" size="icon">
		<Trash />
	</Button>
	<Button onclick={editOpen.toggle} variant="ghost" size="icon">
		<Edit />
	</Button>
	<div>
		{column.title}
	</div>
	<EditColumnDialog bind:open={editOpen.value} {column} />
</div>
