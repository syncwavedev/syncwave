<script lang="ts">
	import {Button} from '$lib/components/ui/button';
	import {getSdk} from '$lib/utils';
	import {Edit, Trash} from 'lucide-svelte';
	import {
		assert,
		type Column,
		type BoardViewColumnDto,
		type Task,
		type TaskDto,
		type TaskId,
		type BoardViewTaskDto,
	} from 'syncwave-data';
	import EditTaskDialog from './edit-task-dialog.svelte';
	import {toggle} from '$lib/utils.svelte';

	let {
		task,
		columns,
	}: {task: BoardViewTaskDto; columns: BoardViewColumnDto[]} = $props();

	const sdk = getSdk();

	async function deleteTask(taskId: TaskId) {
		await sdk(rpc => rpc.deleteTask({taskId}));
	}

	let editOpen = toggle();
</script>

<div class="flex items-center gap-2">
	<Button onclick={() => deleteTask(task.id)} variant="ghost" size="icon">
		<Trash />
	</Button>
	<Button onclick={editOpen.toggle} variant="ghost" size="icon">
		<Edit />
	</Button>
	<div>
		[{task.board.key.toUpperCase()}-{task.counter}] [{task.column?.title}] {task.title}
	</div>
	<EditTaskDialog bind:open={editOpen.value} {task} {columns} />
</div>
