<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import {getSdk} from '$lib/utils';
	import {
		type Column,
		type BoardViewColumnDto,
		type Task,
		type TaskDto,
		Crdt,
		stringifyCrdtDiff,
		parseCrdtDiff,
	} from 'syncwave-data';
	import * as Select from '$lib/components/ui/select/index.js';
	import CommentListLoader from './comment-list-loader.svelte';

	let {
		task: remoteTask,
		columns,
	}: {task: TaskDto; columns: BoardViewColumnDto[]} = $props();

	const localTask = Crdt.load(remoteTask.state);
	$effect(() => {
		localTask.apply(parseCrdtDiff(remoteTask.state));
		newTaskTitle = localTask.snapshot().title;
		newTaskColumnId = localTask.snapshot().columnId;
	});

	let newTaskTitle = $state(remoteTask.title);
	let newTaskColumnId = $state(remoteTask.columnId);

	const sdk = getSdk();

	async function setTaskTitle() {
		const diff = localTask.update(x => {
			x.title = newTaskTitle;
		});
		if (diff) {
			await sdk(rpc =>
				rpc.applyTaskDiff({
					taskId: remoteTask.id,
					diff: stringifyCrdtDiff(diff),
				})
			);
		}
	}

	async function setTaskColumnId() {
		const diff = localTask.update(x => {
			x.columnId = newTaskColumnId;
		});
		if (diff) {
			await sdk(rpc =>
				rpc.applyTaskDiff({
					taskId: remoteTask.id,
					diff: stringifyCrdtDiff(diff),
				})
			);
		}
	}
</script>

Task editor: {remoteTask.title}

<Input bind:value={newTaskTitle} oninput={setTaskTitle} />

<Select.Root
	bind:value={newTaskColumnId}
	onValueChange={setTaskColumnId}
	type="single"
>
	<Select.Trigger class="w-[180px]">
		{columns.find(column => column.id === newTaskColumnId)?.title}
	</Select.Trigger>
	<Select.Content>
		{#each columns as column}
			<Select.Item value={column.id}>{column.title}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>

<CommentListLoader taskId={remoteTask.id} />
