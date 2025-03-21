<script lang="ts">
	import {compareBigFloat, log, type Awareness, type User} from 'syncwave-data';

	import {onMount, tick} from 'svelte';
	import PlusIcon from '../components/icons/plus-icon.svelte';
	import SearchIcon from '../components/icons/search-icon.svelte';
	import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
	import BoardColumn from './board-column.svelte';
	import Scrollable from '../components/scrollable.svelte';
	import type {BoardTreeView, CardView} from '../../agent/view.svelte';
	import CardDetails from './card-details.svelte';
	import {getAgent} from '../../agent/agent.svelte';
	import EditBoardDialog from '../../components/edit-board-dialog/edit-board-dialog.svelte';
	import UserIcon from '../components/icons/user-icon.svelte';
	import EditProfileDialog from '../../components/edit-profile-dialog/edit-profile-dialog.svelte';
	import router from '../../router';
	import {flip} from 'svelte/animate';
	import {createDndContext, DND_TRANSITION_DURATION_MS} from './board-dnd';

	const {
		board,
		awareness,
		me,
		counter,
	}: {
		board: BoardTreeView;
		awareness: Awareness;
		me: User;
		counter?: number;
	} = $props();

	const agent = getAgent();

	let selectedCard = $state<CardView | null>(
		counter
			? (board.columns
					.flatMap(column => column.cards)
					.find(card => card.counter === counter) ?? null)
			: null
	);

	onMount(() => {
		if (selectedCard) {
			router.action(() => {
				selectedCard = null;
			}, true);
		}
	});

	let boardRef: HTMLElement | null = $state(null);

	$effect(() => {
		if (boardRef && selectedCard) {
			tick().then(() => {
				if (boardRef && selectedCard) {
					const cardElement = boardRef.querySelector(
						`[data-card-id="${selectedCard.id}"]`
					) as HTMLElement;

					if (cardElement) {
						const columnElement = cardElement.closest('[data-column-id]');
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
		router.route(`/b/${board.key}/c/${item.counter}`, {
			replace: selectedCard !== null,
			shallow: true,
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

		router.action(() => {
			editBoardOpen = false;
		}, true);
	}

	function editMyProfile() {
		editMyProfileOpen = true;

		router.action(() => {
			editMyProfileOpen = false;
		}, true);
	}

	let columnsContainerRef: HTMLDivElement | null = $state(null);
	let viewportRef: HTMLDivElement | null = $state(null);

	const dndContext = createDndContext(agent);

	$effect(() => {
		if (columnsContainerRef && viewportRef) {
			return dndContext.registerBoard(columnsContainerRef, viewportRef);
		}

		return undefined;
	});
</script>

<main class="flex h-screen w-full">
	<div class="dark:bg-subtle-0 bg-subtle-1 flex min-w-0 grow flex-col">
		<div class="dark:bg-subtle-0 px-4">
			<div class="my-1 flex items-center">
				<div class="text-xs leading-none font-medium">{board.name}</div>
				{#if board.onlineMembers.length > 0}
					<div class="text-2xs text-ink-detail ml-auto">
						online: {board.onlineMembers.map(x => x.fullName).join(', ')}
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
			draggable
			bind:viewportRef
		>
			<div
				bind:this={boardRef}
				bind:this={columnsContainerRef}
				class="no-select flex divide-x-[0px] divide-[#dfdfdf] border-y-[0px] border-[#dfdfdf] px-2 text-xs"
			>
				{#each board.columns as column (column.id)}
					<div animate:flip={{duration: DND_TRANSITION_DURATION_MS}}>
						<BoardColumn
							{column}
							{onCardClick}
							activeCardId={selectedCard?.id}
						/>
					</div>
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
