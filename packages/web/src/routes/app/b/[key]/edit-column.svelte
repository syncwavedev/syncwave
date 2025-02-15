<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import {getSdk} from '$lib/utils';
	import {
		type Column,
		type BoardViewColumnDto,
		stringifyCrdtDiff,
		parseCrdtDiff,
		Crdt,
	} from 'syncwave-data';

	let {column: remoteColumn}: {column: BoardViewColumnDto} = $props();

	const localColumn = Crdt.load(remoteColumn.state);
	$effect(() => {
		localColumn.apply(parseCrdtDiff(remoteColumn.state));
		columnTitle = localColumn.snapshot().title;
	});

	let columnTitle = $state(remoteColumn.title);

	const sdk = getSdk();

	async function setColumnTitle() {
		const diff = localColumn.update(x => {
			x.title = columnTitle;
		});
		if (diff) {
			await sdk(rpc =>
				rpc.applyColumnDiff({
					columnId: remoteColumn.id,
					diff: stringifyCrdtDiff(diff),
				})
			);
		}
	}
</script>

Column editor: {remoteColumn.title}

<Input bind:value={columnTitle} oninput={setColumnTitle} />
