<script lang="ts">
	import {Button} from '$lib/components/ui/button';
	import {getSdk} from '$lib/utils';
	import {Edit, Trash} from 'lucide-svelte';
	import {
		createTaskId,
		type BoardViewColumnDto,
		type ColumnId,
	} from 'syncwave-data';
	import EditColumnDialog from './edit-column-dialog.svelte';
	import {toggle} from '$lib/utils.svelte';
	import {Input} from '$lib/components/ui/input';
	import TaskCard from './task-card.svelte';

	let {
		column,
		columns,
	}: {column: BoardViewColumnDto; columns: BoardViewColumnDto[]} = $props();

	const sdk = getSdk();

	async function deleteColumn(columnId: ColumnId) {
		await sdk(rpc => rpc.deleteColumn({columnId}));
	}

	let editOpen = toggle();

	let taskTitle = $state('');
	async function addTask() {
		await sdk(rpc =>
			rpc.createTask({
				boardId: column.boardId,
				title: taskTitle,
				columnId: column.id,
				placement: {},
				taskId: createTaskId(),
			})
		);
	}
</script>

<div>
	<div class="flex items-center gap-2">
		<Button
			onclick={() => deleteColumn(column.id)}
			variant="ghost"
			size="icon"
		>
			<Trash />
		</Button>
		<Button onclick={editOpen.toggle} variant="ghost" size="icon">
			<Edit />
		</Button>
		<div>
			{column.title}
		</div>
		<EditColumnDialog bind:open={editOpen.value} {column} />
	</div>

	<div>
		<div class="flex flex-col gap-2">
			<div>Tasks:</div>
			<div class="flex gap-4">
				<Input bind:value={taskTitle} placeholder="title" />

				<Button onclick={addTask}>Add task</Button>
			</div>
			{#each column.tasks as task}
				<TaskCard {task} {columns} />
			{/each}
		</div>
	</div>
</div>
