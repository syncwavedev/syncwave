<script lang="ts">
	import type {BoardDto} from 'syncwave-data';

	let {
		board,
	}: {
		board: BoardDto;
	} = $props();
</script>

<div>
	{board.name}
</div>
