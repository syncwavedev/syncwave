<script lang="ts">
	import type {LayoutProps} from './$types';
	import BoardLayoutFrozen from '$lib/components/board-layout-frozen.svelte';

	const {data, children}: LayoutProps = $props();
	const {boardKey, initialBoard, initialMe} = $derived(data);
</script>

{#key boardKey}
	<BoardLayoutFrozen {boardKey} {initialBoard} {initialMe}>
		{@render children()}
	</BoardLayoutFrozen>
{/key}
