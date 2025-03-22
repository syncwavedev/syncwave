<script lang="ts">
	import {flip} from 'svelte/animate';
	import {unimplemented} from 'syncwave-data';

	let items = $state([1, 2, 3, 4, 5]);
</script>

{#each items as item (item)}
	<div
		animate:flip={{duration: 1000}}
		class="bg-amber-200 text-3xl p-5 border-2 w-10"
	>
		{item}
	</div>
{/each}

<button
	onclick={() => {
		if (items[0] === 1) {
			items = [2, 1, 3, 4, 5];
		} else if (items[1] === 1) {
			items = [2, 3, 1, 4, 5];
		} else if (items[2] === 1) {
			items = [2, 3, 4, 1, 5];
		} else if (items[3] === 1) {
			items = [2, 3, 4, 5, 1];
		} else if (items[4] === 1) {
			items = [1, 2, 3, 4, 5];
		} else {
			unimplemented();
		}
	}}
>
	order
</button>
