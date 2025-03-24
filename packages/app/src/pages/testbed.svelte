<script lang="ts">
	import {flip} from 'svelte/animate';
	import {unimplemented} from 'syncwave-data';

	const NUM = 10;
	let items = $state(
		Array(NUM)
			.fill(0)
			.map((_, i) => i + 1)
	);
</script>

<button
	onclick={() => {
		let counter = 0;
		items = Array(NUM)
			.fill(0)
			.map((_, i) => i + 1);

		setTimeout(() => {
			const interval = setInterval(
				() => {
					if (counter++ >= NUM - 2) {
						clearInterval(interval);
					}

					[items[counter - 1], items[counter]] = [
						items[counter],
						items[counter - 1],
					];
				},
				300 / (NUM - 1)
			);
		}, 500);
	}}
>
	order
</button>

{#each items as item (item)}
	<div
		animate:flip={{duration: 300}}
		class="bg-amber-200 text-3xl p-5 border-2 w-100"
	>
		{item}
	</div>
{/each}
