<script lang="ts">
	import Editor from '$lib/components/editor.svelte';
	import {Crdt, createRichtext} from 'syncwave-data';

	const a = Crdt.from({
		text: createRichtext(),
	});
	const b = a.clone();

	const fragmentA = a.extractXmlFragment(x => x.text);
	const fragmentB = b.extractXmlFragment(x => x.text);

	$effect(() => a.onUpdate(diff => b.apply(diff)));
	$effect(() => b.onUpdate(diff => a.apply(diff)));
</script>

<div class="flex flex-col gap-4">testbed</div>

<div class="mx-auto max-w-md">
	<Editor fragment={fragmentA} />

	<Editor fragment={fragmentB} />
</div>
