<script lang="ts">
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import {Button} from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import {Separator} from '$lib/components/ui/separator';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import {getSdk} from '$lib/utils';
	import {getState} from '$lib/utils.svelte';
	import {createTaskId, log, type TaskId} from 'syncwave-data';
	import {flip} from 'svelte/animate';
	import {dndzone} from 'svelte-dnd-action';

	import {
		createColumnId,
		type ColumnId,
	} from '../../../../../../data/dist/esm/src/data/repos/column-repo';
	import {goto} from '$app/navigation';
	import ColumnCard from './column-card.svelte';
	import Board from './board.svelte';

	const {data} = $props();
	const {boardKey, initialBoard} = data;

	const board = getState(initialBoard, x => x.getBoardView({key: boardKey}));

	const sdk = getSdk();

	let columnTitle = $state('');
	async function addColumn() {
		await sdk(rpc =>
			rpc.createColumn({
				boardId: board.value.id,
				title: columnTitle,
				columnId: createColumnId(),
			})
		);
	}

	$effect(() => {
		if (board.value.deleted) {
			log.info(`board ${board.value.id} got deleted, redirect to app...`);
			goto('/app');
		}
	});

	async function deleteBoard() {
		await sdk(rpc => rpc.deleteBoard({boardId: board.value.id}));
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
					<Breadcrumb.Link href="#">{board.value.key}</Breadcrumb.Link>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</div>
</header>
<div class="flex flex-col gap-4 p-4">
	<div>
		Board {board.value.id} - {board.value.createdAt}

		<Button variant="destructive" onclick={deleteBoard}>Delete board</Button>
	</div>

	<div class="flex flex-col gap-8">
		<div>
			<div>Columns:</div>
			<div class="flex gap-4">
				<Input bind:value={columnTitle} />
				<Button onclick={addColumn}>Add column</Button>
			</div>
		</div>
		{#each board.value.columns as column}
			<ColumnCard {column} columns={board.value.columns} />
		{/each}
	</div>
</div>

<Board board={board.value} />
