<script lang="ts">
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import {Button} from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import {Separator} from '$lib/components/ui/separator';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import {getSdk} from '$lib/utils';
	import {observe} from '$lib/utils.svelte';
	import {log} from 'syncwave-data';

	import {createColumnId} from 'syncwave-data';
	import {goto} from '$app/navigation';
	import ColumnCard from './column-card.svelte';
	import BoardController from './board-controller.svelte';
	import {toBigFloat} from '../../../../../../data/dist/esm/src/big-float';

	const {data} = $props();
	const {boardKey, initialBoard} = data;

	const board = observe(initialBoard, x => {
		return x.getBoardView({key: boardKey});
	});

	const sdk = getSdk();

	let columnTitle = $state('');
	async function addColumn() {
		await sdk(rpc =>
			rpc.createColumn({
				boardId: board.value.id,
				title: columnTitle,
				columnId: createColumnId(),
				boardPosition: toBigFloat(Math.random()),
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
		{board.value.name}
	</div>
</header>

<div class="flex flex-col gap-4 p-4">
	<BoardController board={board.value} />
	<div>
		Board {board.value.id} - {board.value.createdAt}

		<Button variant="destructive" onclick={deleteBoard}>Delete board</Button
		>
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
