<script lang="ts">
	import ScrollArea from '$lib/components/scroll-area.svelte';
	import Tiptap from '$lib/components/editor.svelte';
	import UploadButton from '$lib/components/upload-button.svelte';
	import {getAuthManager, getSdk} from '$lib/utils';
	import {observe} from '$lib/utils.svelte';
	import {untrack} from 'svelte';
	import {
		Crdt,
		log,
		stringifyCrdtDiff,
		toCrdtDiff,
		type Board,
		type CrdtDiff,
	} from 'syncwave-data';

	const sdk = getSdk();
</script>

<div class="flex flex-col gap-4">testbed</div>

<div class="mx-auto max-w-md">
	<Tiptap />
</div>
