<script lang="ts">
	import {observeBoard} from '$lib/sdk/sdk.svelte';

	let {data} = $props();
	let {initialBoardData, boardKey} = data;

	const boardView = observeBoard(boardKey, initialBoardData);
	let card = boardView.columns[0].cards[0];
</script>

Key: {card.board.key}-{card.counter}
Column: {card.column.name}
