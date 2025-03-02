<script>
	import PageImpl from './page-impl.svelte';

	let {data} = $props();
	let {boardKey, counter, initialCard} = $derived(data);
</script>

{#key initialCard.id}
	<PageImpl {boardKey} {counter} {initialCard} />
{/key}
