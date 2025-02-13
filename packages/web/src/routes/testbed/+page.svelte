<script lang="ts">
	import Component from './component.svelte';

	const {data} = $props();
	const {boardKey, initialBoard} = data;

	let open = $state(false);
</script>

<button
	onclick={() => {
		open = !open;
	}}>Toggle</button
>

{#if open}
	<Component {initialBoard} />
{/if}
