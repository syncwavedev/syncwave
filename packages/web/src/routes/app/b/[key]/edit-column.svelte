<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import {getSdk} from '$lib/utils';
	import type {Column, BoardViewColumnDto} from 'syncwave-data';

	let {column}: {column: BoardViewColumnDto} = $props();

	let columnTitle = $state(column.title);

	$effect(() => {
		columnTitle = column.title;
	});

	const sdk = getSdk();

	async function setColumnTitle() {
		await sdk(rpc =>
			rpc.setColumnTitle({columnId: column.id, title: columnTitle})
		);
	}
</script>

Column editor: {column.title}

<Input bind:value={columnTitle} onchange={setColumnTitle} />
