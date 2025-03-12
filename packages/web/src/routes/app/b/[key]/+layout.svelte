<script lang="ts">
	import BoardScreen from '$lib/ui/boards/board-screen.svelte';
	import type {LayoutProps} from './$types';

	const {data}: LayoutProps = $props();
	const {boardKey, initialBoard} = $derived(data);
</script>

{#key boardKey}
	<BoardScreen {boardKey} {initialBoard} />
{/key}
