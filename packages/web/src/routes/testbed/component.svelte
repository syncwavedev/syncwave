<script lang="ts">
	import {getState} from '$lib/utils.svelte';
	import {type BoardViewDto} from 'syncwave-data';

	const {initialBoard}: {initialBoard: BoardViewDto} = $props();

	const board = getState(initialBoard, x => {
		return x.getBoardView({key: 'FIRST'});
	});
</script>

{board.value.name}
