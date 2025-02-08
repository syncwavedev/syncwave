<script lang="ts">
	import {Button} from '$lib/components/ui/button';
	import {getSdk} from '$lib/utils';
	import {Edit, Trash} from 'lucide-svelte';
	import {
		assert,
		type Column,
		type ColumnDto,
		type Task,
		type TaskDto,
		type TaskId,
	} from 'syncwave-data';
	import EditTaskDialog from './edit-task-dialog.svelte';
	import {toggle} from '$lib/utils.svelte';

	let {task, columns}: {task: TaskDto; columns: ColumnDto[]} = $props();

	const sdk = getSdk();

	async function deleteTask(taskId: TaskId) {
		await sdk(rpc => rpc.deleteTask({taskId}));
	}

	let editOpen = toggle();
</script>

<div class="flex items-center gap-2">
	<div>
		[{task.board.key.toUpperCase()}-{task.counter}] [{task.column?.title}] {task.title}
	</div>
	<Button onclick={() => deleteTask(task.id)} variant="ghost" size="icon">
		<Trash />
	</Button>
	<Button onclick={editOpen.toggle} variant="ghost" size="icon">
		<Edit />
	</Button>
	<EditTaskDialog bind:open={editOpen.value} {task} {columns} />
</div>
