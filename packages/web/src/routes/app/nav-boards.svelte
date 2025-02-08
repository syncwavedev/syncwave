<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type {BoardDto} from 'syncwave-data';
	import NavBoardCard from './nav-board-card.svelte';

	let {
		boards,
	}: {
		boards: BoardDto[];
	} = $props();

	function generateAvatar(name: string): {avatar: string; color: string} {
		if (!name) return {avatar: '', color: '#000000'};

		// Split the name by spaces and filter out empty strings
		const words = name
			.split(' ')
			.map(word => word.replace(/[^a-zA-Z]/g, ''))
			.filter(word => word.length > 0);

		// Generate the avatar
		const avatar =
			words.length > 0
				? words.length > 1
					? words[0][0].toUpperCase() + words[1][0].toUpperCase()
					: words[0][0].toUpperCase()
				: '';

		const colors = [
			'#e66651',
			'#f68c3e',
			'#8f83f3',
			'#74cb46',
			'#76c9de',
			'#519be2',
			'#f47298',
			'#80d066',
		];

		// Hash function to consistently select a color
		const hash = Array.from(name).reduce(
			(acc, char) => acc + char.charCodeAt(0),
			0
		);

		// Use the hash to pick a color from the array
		const color = colors[hash % colors.length];

		return {avatar, color};
	}
</script>

<Sidebar.Menu>
	{#each boards as board (board.id)}
		<NavBoardCard {board} />
	{/each}
</Sidebar.Menu>
