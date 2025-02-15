<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type {BoardDto} from 'syncwave-data';
	import NavBoardCard from './nav-board-card.svelte';

	let {
		boards,
	}: {
		boards: BoardDto[];
	} = $props();
</script>

<Sidebar.Menu>
	{#each boards as board (board.id)}
		<NavBoardCard {board} />
	{/each}
</Sidebar.Menu>
