<script lang="ts">
	import {usePageState} from '$lib/utils.svelte';
	import {compareBigFloat, log, type BoardViewDataDto} from 'syncwave-data';

	import {goto} from '$app/navigation';
	import {getAppRoute} from '$lib/routes';
	import {tick} from 'svelte';
	import PlusIcon from '../components/icons/plus-icon.svelte';
	import SearchIcon from '../components/icons/search-icon.svelte';
	import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
	import BoardColumn from './board-column.svelte';
	import appNavigator from '../app-navigator';
	import {useBoardView} from './use-board-view.svelte';
	import {dragHandleZone} from 'svelte-dnd-action';
	import Scrollable from '../components/scrollable.svelte';
	import type {CardView} from '$lib/agent/view.svelte';
	import CardDetails from './card-details.svelte';
	import {getAgent} from '$lib/agent/agent.svelte';
	import EditBoardDialog from '$lib/components/edit-board-dialog/edit-board-dialog.svelte';

	const {
		boardKey,
		initialBoard,
	}: {
		boardKey: string;
		initialBoard: BoardViewDataDto;
	} = $props();
	const agent = getAgent();
	const board = agent.observeBoard(boardKey, initialBoard);
	const {
		columns,
		handleDndConsiderColumns,
		handleDndFinalizeColumns,
		createCardHandler,
	} = useBoardView({value: board});

	let selectedCard = $state<CardView | null>(null);
	let boardRef: HTMLElement | null = $state(null);

	$effect(() => {
		if (selectedCard && boardRef) {
			tick().then(() => {
				if (boardRef && selectedCard) {
					const cardElement = boardRef.querySelector(
						`[data-card-id="${selectedCard.id}"]`
					) as HTMLElement;

					if (cardElement) {
						cardElement.scrollIntoView({
							behavior: 'smooth',
							block: 'center',
							// inline: 'center',
						});
					}
				}
			});
		}
	});

	function onCardClick(item: CardView) {
		appNavigator.replace({
			onBack: () => {
				selectedCard = null;
			},
			onEscape: true,
		});

		selectedCard = item;
	}

	$effect(() => {
		if (board.deleted) {
			log.info(`board ${board.id} got deleted, redirect to app...`);
			goto(getAppRoute());
		}
	});

	async function createCard() {
		const firstColumn = board.columns[0];
		if (firstColumn === undefined) {
			alert('Please, create a column first');
			return;
		}

		agent.createCard({
			boardId: board.id,
			columnId: firstColumn.id,
			placement: {
				prev: undefined,
				next: [...firstColumn.cards].sort((a, b) =>
					compareBigFloat(a.columnPosition, b.columnPosition)
				)[0]?.columnPosition,
			},
		});
	}

	const editBoardOpen = usePageState(false);
</script>

<main class="flex h-screen w-full">
	<div class="dark:bg-subtle-0 bg-subtle-1 flex min-w-0 grow flex-col">
		<!-- Fixed Header -->
		<div class="dark:bg-subtle-0 px-4">
			<div class="my-1 flex items-center">
				<div class="text-xs leading-none font-medium">{board.name}</div>
				<button class="btn--icon ml-auto" onclick={createCard}>
					<PlusIcon />
				</button>
				<button class="btn--icon">
					<SearchIcon />
				</button>
				<button onclick={() => editBoardOpen.push(true)} class="btn--icon">
					<EllipsisIcon />
				</button>
				<EditBoardDialog
					{board}
					open={editBoardOpen.value}
					onClose={() => editBoardOpen.push(false)}
				/>
			</div>
		</div>
		<Scrollable orientation="horizontal" class="flex-grow" type="scroll">
			<div
				bind:this={boardRef}
				class="flex divide-x-[0px] divide-[#dfdfdf] border-y-[0px] border-[#dfdfdf] px-2 text-xs"
				use:dragHandleZone={{
					items: columns.value,
					flipDurationMs: 100,
					type: 'columns',
					dropTargetStyle: {},
				}}
				onconsider={handleDndConsiderColumns}
				onfinalize={handleDndFinalizeColumns}
			>
				{#each columns.value as column (column.id)}
					<BoardColumn
						{column}
						{onCardClick}
						handleCardDnd={createCardHandler(column)}
						activeCardId={selectedCard?.id}
					/>
				{/each}
			</div>
		</Scrollable>
	</div>
	{#if selectedCard !== null}
		{#key selectedCard.id}
			<CardDetails card={selectedCard} />
		{/key}
	{/if}
</main>
