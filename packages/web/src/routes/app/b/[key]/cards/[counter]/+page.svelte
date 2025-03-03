<script>
	import CardPageFrozen from '$lib/components/card-page-frozen.svelte';

	let {data} = $props();
	let {boardKey, counter, initialCard} = $derived(data);
</script>

{#key initialCard.id}
	<CardPageFrozen {boardKey} {counter} {initialCard} />
{/key}
