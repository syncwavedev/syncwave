<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import {ScrollArea} from '$lib/components/ui/scroll-area';
	import type {BoardViewColumnDto, Task, TaskDto} from 'syncwave-data';
	import EditTask from './edit-task.svelte';

	let {
		task,
		columns,
		open = $bindable(),
	}: {task: TaskDto; columns: BoardViewColumnDto[]; open: boolean} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-[1000px]">
		<Dialog.Header>
			<Dialog.Description>Edit task: {task.title}</Dialog.Description>
		</Dialog.Header>
		<ScrollArea class="max-h-[80vh]">
			<EditTask {task} {columns} />
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
