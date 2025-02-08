<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import {getSdk} from '$lib/utils';
	import type {Column, ColumnDto, Task, TaskDto} from 'syncwave-data';
	import * as Select from '$lib/components/ui/select/index.js';
	import TaskCommentList from './task-comment-list.svelte';

	let {task, columns}: {task: TaskDto; columns: ColumnDto[]} = $props();

	let taskTitle = $state(task.title);
	let taskColumnId = $state(task.columnId ?? undefined);

	$effect(() => {
		taskTitle = task.title;
	});

	$effect(() => {
		taskColumnId = task.columnId ?? undefined;
	});

	const sdk = getSdk();

	async function setTaskTitle() {
		await sdk(rpc => rpc.setTaskTitle({taskId: task.id, title: taskTitle}));
	}

	async function setTaskColumnId() {
		await sdk(rpc =>
			rpc.setTaskColumnId({
				taskId: task.id,
				columnId: taskColumnId ?? null,
			})
		);
	}
</script>

Task editor: {task.title}

<Input bind:value={taskTitle} onchange={setTaskTitle} />

<Select.Root
	bind:value={taskColumnId}
	onValueChange={setTaskColumnId}
	type="single"
>
	<Select.Trigger class="w-[180px]">
		{columns
			.concat(task.column ? [task.column] : [])
			.find(column => column.id === taskColumnId)?.title}
	</Select.Trigger>
	<Select.Content>
		{#each columns as column}
			<Select.Item value={column.id}>{column.title}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>

<TaskCommentList taskId={task.id} />
