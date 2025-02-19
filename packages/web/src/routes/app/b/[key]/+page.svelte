<script lang="ts">
	import {observe} from '$lib/utils.svelte';
	import {log} from 'syncwave-data';

	import {goto} from '$app/navigation';
	import BoardController from './board-controller.svelte';

	const {data} = $props();
	const {boardKey, initialBoard} = data;

	const board = observe(initialBoard, x => {
		return x.getBoardView({key: boardKey});
	});

	$effect(() => {
		if (board.value.deleted) {
			log.info(`board ${board.value.id} got deleted, redirect to app...`);
			goto('/app');
		}
	});
</script>

<BoardController board={board.value} />
