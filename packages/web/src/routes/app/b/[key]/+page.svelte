<script lang="ts">
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import {Button} from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import {Separator} from '$lib/components/ui/separator';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import {getSdk} from '$lib/utils';
	import {getState} from '$lib/utils.svelte';
	import {createTaskId, log, type TaskId} from 'syncwave-data';
	import * as Select from '$lib/components/ui/select/index.js';

	import {
		createColumnId,
		type ColumnId,
	} from '../../../../../../data/dist/esm/src/data/repos/column-repo';
	import {goto} from '$app/navigation';
	import {Trash} from 'lucide-svelte';
	import TaskCard from './task-card.svelte';

	const {data} = $props();
	const {boardKey, initialBoard} = data;

	const board = getState(initialBoard, x => x.getBoardView({key: boardKey}));

	const sdk = getSdk();

	let columnTitle = $state('');
	async function addColumn() {
		await sdk(rpc =>
			rpc.createColumn({
				boardId: board.value.board.id,
				title: columnTitle,
				columnId: createColumnId(),
			})
		);
	}

	let taskTitle = $state('');
	let taskColumnId: string = $state('');
	async function addTask() {
		await sdk(rpc =>
			rpc.createTask({
				boardId: board.value.board.id,
				title: taskTitle,
				columnId: (taskColumnId as ColumnId) || null,
				placement: {type: 'random'},
				taskId: createTaskId(),
			})
		);
	}

	$effect(() => {
		log.info('board: ' + board.value.board.deleted);
		if (board.value.board.deleted) {
			goto('/app');
		}
	});

	async function deleteBoard() {
		await sdk(rpc => rpc.deleteBoard({boardId: board.value.board.id}));
	}

	async function deleteColumn(columnId: ColumnId) {
		await sdk(rpc => rpc.deleteColumn({columnId}));
	}
</script>

<header
	class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
>
	<div class="flex items-center gap-2 px-4">
		<Sidebar.Trigger class="-ml-1" />
		<Separator orientation="vertical" class="mr-2 h-4" />
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item class="hidden md:block">
					<Breadcrumb.Link href="#">{board.value.board.key}</Breadcrumb.Link>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</div>
</header>
<div class="flex flex-col gap-4 p-4">
	<div>
		Board {board.value.board.id} - {board.value.board.createdAt}

		<Button variant="destructive" onclick={deleteBoard}>Delete board</Button>
	</div>

	<div class="flex flex-col gap-2">
		<div>Columns:</div>
		<div class="flex gap-4">
			<Input bind:value={columnTitle} />
			<Button onclick={addColumn}>Add column</Button>
		</div>
		{#each board.value.columns as column}
			<div>
				{column.id} - {column.title}
				<Button onclick={() => deleteColumn(column.id)} variant="ghost" size="icon">
					<Trash />
				</Button>
			</div>
		{/each}
	</div>

	<Separator />

	<div>
		<div class="flex flex-col gap-2">
			<div>Tasks:</div>
			<div class="flex gap-4">
				<Input bind:value={taskTitle} placeholder="title" />
				<Select.Root bind:value={taskColumnId} type="single">
					<Select.Trigger class="w-[180px]">
						{board.value.columns.find(x => x.id === taskColumnId)?.title}
					</Select.Trigger>
					<Select.Content>
						{#each board.value.columns as column}
							<Select.Item value={column.id}>{column.title}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<Button onclick={addTask}>Add task</Button>
			</div>
			{#each board.value.tasks as task}
				<TaskCard {task} columns={board.value.columns} />
			{/each}
		</div>
	</div>
</div>
