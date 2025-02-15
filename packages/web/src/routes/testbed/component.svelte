<script lang="ts">
	import {observe} from '$lib/utils.svelte';
	import {type BoardViewDto} from 'syncwave-data';

	const {initialBoard}: {initialBoard: BoardViewDto} = $props();

	const board = observe(initialBoard, x => {
		return x.getBoardView({key: 'FIRST'});
	});
</script>

{board.value.name}
