<script lang="ts">
	import {
		compareBigFloat,
		log,
		type Awareness,
		type User,
	} from 'syncwave-data';

	import {tick} from 'svelte';
	import PlusIcon from '../components/icons/plus-icon.svelte';
	import SearchIcon from '../components/icons/search-icon.svelte';
	import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
	import BoardColumn from './board-column.svelte';
	import appNavigator from '../../app-navigator';
	import {useBoardView} from './use-board-view.svelte';
	import {dragHandleZone} from 'syncwave-dnd';
	import Scrollable from '../components/scrollable.svelte';
	import type {BoardTreeView, CardView} from '../../agent/view.svelte';
	import CardDetails from './card-details.svelte';
	import {getAgent} from '../../agent/agent.svelte';
	import EditBoardDialog from '../../components/edit-board-dialog/edit-board-dialog.svelte';
	import UserIcon from '../components/icons/user-icon.svelte';
	import EditProfileDialog from '../../components/edit-profile-dialog/edit-profile-dialog.svelte';
	import router from '../../router';

	const {
		board,
		awareness,
		me,
	}: {
		board: BoardTreeView;
		awareness: Awareness;
		me: User;
	} = $props();

	const agent = getAgent();

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

	$effect(() => {
		awareness.setLocalStateField('selectedCardId', selectedCard?.id);
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
			router.route('/');
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

	let editBoardOpen = $state(false);
	let editMyProfileOpen = $state(false);

	function editBoard() {
		editBoardOpen = true;

		appNavigator.push({
			onBack: () => {
				editBoardOpen = false;
			},
			onEscape: true,
		});
	}

	function editMyProfile() {
		editMyProfileOpen = true;

		appNavigator.push({
			onBack: () => {
				editMyProfileOpen = false;
			},
			onEscape: true,
		});
	}
</script>

<main class="flex h-screen w-full">
	<div class="dark:bg-subtle-0 bg-subtle-1 flex min-w-0 grow flex-col">
		<div class="dark:bg-subtle-0 px-4">
			<div class="my-1 flex items-center">
				<div class="text-xs leading-none font-medium">{board.name}</div>
				{#if board.onlineMembers.length > 0}
					<div class="text-2xs text-ink-detail ml-auto">
						online: {board.onlineMembers
							.map(x => x.fullName)
							.join(', ')}
					</div>
				{/if}
				<button class="btn--icon ml-auto" onclick={createCard}>
					<PlusIcon />
				</button>
				<button class="btn--icon">
					<SearchIcon />
				</button>
				<button onclick={editBoard} class="btn--icon">
					<EllipsisIcon />
				</button>
				<EditBoardDialog
					{board}
					open={editBoardOpen}
					onClose={() => {
						editBoardOpen = false;
					}}
				/>
				<button onclick={editMyProfile} class="btn--icon">
					<UserIcon />
				</button>
				<EditProfileDialog
					profile={me}
					open={editMyProfileOpen}
					onClose={() => {
						editMyProfileOpen = false;
					}}
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
			<CardDetails {me} {board} {awareness} card={selectedCard} />
		{/key}
	{/if}
</main>
