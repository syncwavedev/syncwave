<script lang="ts">
	import {getSdk} from '$lib/utils';
	import {context, Crdt, stringifyCrdtDiff} from 'syncwave-data';
	import {observe} from '$lib/utils.svelte';

	const {data} = $props();
	const {boardKey, initialBoard} = data;
</script>

<div class="flex flex-col gap-4">testbed</div>
<div>
	{initialBoard.name}
</div>
