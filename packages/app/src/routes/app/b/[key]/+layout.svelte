<script lang="ts">
	import BoardScreen from '$lib/ui/boards/board-screen.svelte';
	import type {LayoutProps} from './$types';

	const {data}: LayoutProps = $props();
	const {boardKey, initialBoard, initialMe} = $derived(data);
</script>

{#key boardKey}
	<BoardScreen {boardKey} {initialBoard} initialMe={initialMe.user} />
{/key}
