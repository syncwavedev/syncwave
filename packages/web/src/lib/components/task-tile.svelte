<script lang="ts">
	import type {BoardViewTaskDto, TaskDto} from 'syncwave-data';
	import Avatar from './avatar.svelte';

	let {task}: {task: BoardViewTaskDto} = $props();
</script>

<div class="subtle-2 hover-subtle-3 flex flex-col gap-1 rounded-lg p-2">
	<span class="text-ink truncate">{task.title}</span>
	<div class="flex items-center justify-between gap-0.5">
		<span class="text-2xs text-ink-detail"
			>{task.board.key}-{task.counter}</span
		>
		<span class="text-[1.25rem]">
			<Avatar user={task.author} />
		</span>
	</div>
</div>
