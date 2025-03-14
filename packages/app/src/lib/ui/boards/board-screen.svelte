<script lang="ts">
	import {usePageState} from '$lib/utils.svelte';
	import {
		compareBigFloat,
		log,
		type BoardViewDataDto,
		type User,
	} from 'syncwave-data';

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
	import UserIcon from '../components/icons/user-icon.svelte';
	import EditProfileDialog from '$lib/components/edit-profile-dialog/edit-profile-dialog.svelte';

	const {
		boardKey,
		initialBoard,
		initialMe,
	}: {
		boardKey: string;
		initialBoard: BoardViewDataDto;
		initialMe: User;
	} = $props();
	const agent = getAgent();
	const [board, awareness] = agent.observeBoard(initialBoard);
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
						const columnElement =
							cardElement.closest('[data-column-id]');
						if (columnElement) {
							columnElement.scrollIntoView({
								behavior: 'smooth',
								inline: 'nearest',
								block: 'nearest',
							});
						}
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

		agent.createCardDraft(board, {
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
	const editMyProfileOpen = usePageState(false);
</script>

<main class="flex h-screen w-full">
	<div class="dark:bg-subtle-0 bg-subtle-1 flex min-w-0 grow flex-col">
		<div class="dark:bg-subtle-0 px-4">
			<div class="my-1 flex items-center">
				<div class="text-xs leading-none font-medium">{board.name}</div>
				<button class="btn--icon ml-auto" onclick={createCard}>
					<PlusIcon />
				</button>
				<button class="btn--icon">
					<SearchIcon />
				</button>
				<button
					onclick={() => editBoardOpen.push(true)}
					class="btn--icon"
				>
					<EllipsisIcon />
				</button>
				<EditBoardDialog
					{board}
					open={editBoardOpen.value}
					onClose={() => editBoardOpen.push(false)}
				/>
				<button
					onclick={() => editMyProfileOpen.push(true)}
					class="btn--icon"
				>
					<UserIcon />
				</button>
				<EditProfileDialog
					profile={initialMe}
					open={editMyProfileOpen.value}
					onClose={() => editMyProfileOpen.push(false)}
				/>
			</div>
		</div>
		<Scrollable
			orientation="horizontal"
			class="flex-grow"
			type="scroll"
			draggable={true}
		>
			<div
				bind:this={boardRef}
				class="no-select flex divide-x-[0px] divide-[#dfdfdf] border-y-[0px] border-[#dfdfdf] px-2 text-xs"
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
			<CardDetails {board} {awareness} card={selectedCard} />
		{/key}
	{/if}
</main>
