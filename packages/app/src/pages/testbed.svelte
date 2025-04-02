<script lang="ts">
	import ListAnimator from '../lib/ui/components/list-animator.svelte';

	const NUM = 3;
	let items = $state(
		Array(NUM)
			.fill(0)
			.map((_, i) => i + 1)
	);
	setInterval(() => {
		console.log($state.snapshot(items));
	}, 1000);
</script>

<button
	class="absolute z-1 top-0 right-0"
	onclick={() => {
		items = [1, 3];
	}}
>
	order
</button>

<ListAnimator {items} gap={0} key={item => item.toString()}>
	{#snippet renderItem(item)}
		<div class="bg-amber-200 text-3xl p-5 border-2 w-100 h-[100px]">
			{item}
		</div>
	{/snippet}
</ListAnimator>
