<script lang="ts">
	import {compareNumbers, log, type Awareness, type User} from 'syncwave';

	import {onMount, tick} from 'svelte';
	import PlusIcon from '../components/icons/plus-icon.svelte';
	import SearchIcon from '../components/icons/search-icon.svelte';
	import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
	import BoardColumn from './board-column.svelte';
	import Scrollable from '../components/scrollable.svelte';
	import type {
		BoardTreeView,
		CardView,
		ColumnTreeView,
		MeView,
	} from '../../agent/view.svelte';
	import CardDetails from './card-details.svelte';
	import {getAgent} from '../../agent/agent.svelte';
	import EditBoardDialog from '../../components/edit-board-dialog/edit-board-dialog.svelte';
	import UserIcon from '../components/icons/user-icon.svelte';
	import EditProfileDialog from '../../components/edit-profile-dialog/edit-profile-dialog.svelte';
	import router from '../../router';
	import {flip} from 'svelte/animate';
	import {createDndContext, DND_REORDER_DURATION_MS} from './board-dnd';
	import {yFragmentToPlaintextAndTaskList} from '../../richtext';

	const {
		board,
		awareness,
		me,
		counter,
	}: {
		board: BoardTreeView;
		awareness: Awareness;
		me: MeView;
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
				router.route(`/b/${board.key}`, {replace: true, shallow: true});
			}, true);
		}
	});

	function selectCard(card: CardView | null) {
		if (selectedCard?.id === card?.id) {
			return;
		}

		if (selectedCard?.isDraft) {
			agent.deleteCard(selectedCard.id);
		}

		const replace = selectedCard !== null;
		selectedCard = card;

		if (card?.isDraft) {
			router.action(() => {
				selectCard(null);
			}, true);
			return;
		}

		if (card) {
			router.route(`/b/${board.key}/c/${card.counter}`, {
				replace,
				shallow: true,
				onBack: () => {
					selectCard(null);
				},
				onEscape: true,
			});
		} else {
			router.route(`/b/${board.key}`, {
				replace: true,
				shallow: true,
			});
		}
	}

	let boardRef: HTMLElement | null = $state(null);

	$effect(() => {
		if (boardRef && selectedCard) {
			tick().then(() => {
				if (boardRef && selectedCard) {
					const cardElement = boardRef.querySelector(
						`[data-card-id="${selectedCard.id}"]`
					) as HTMLElement;

					if (cardElement) {
						const columnElement =
							cardElement.closest('[data-column-id]');
						if (columnElement) {
							// requestAnimationFrame makes it work in Safari when pointer down => small move => pointer up
							// it registers like a click (as it should), but Safari doesn't scroll smoothly to the element
							// in that case for some reason (draggable scrollable and board dnd has nothing to do with it
							// because it's reproducible even without dnd and draggable scrollable)
							requestAnimationFrame(() => {
								columnElement.scrollIntoView({
									behavior: 'smooth',
									inline: 'nearest',
									block: 'nearest',
								});
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

	$effect(() => {
		if (board.deleted) {
			log.info(`board ${board.id} got deleted, redirect to app...`);
			router.route('/');
		}
	});

	async function createCard(column?: ColumnTreeView) {
		if (!column) {
			const firstColumn = board.columns[0];
			if (!firstColumn) {
				alert('Please, create a column first');
				return;
			}

			column = firstColumn;
		}

		if (selectedCard?.isDraft) {
			agent.setCardColumn(selectedCard.id, column.id);
			return;
		}

		const draft = agent.createCardDraft(board, {
			columnId: column.id,
			placement: {
				prev: undefined,
				next: [...column.cards].sort((a, b) =>
					compareNumbers(a.position, b.position)
				)[0]?.position,
			},
		});

		selectCard(draft);
	}

	async function deleteCard(card: CardView) {
		agent.deleteCard(card.id);
		selectCard(null);
	}

	$effect(() => {
		if (selectedCard?.isDraft) {
			const {text} = yFragmentToPlaintextAndTaskList(
				selectedCard.text.__fragment!
			);
			if (text.length > 0) {
				agent.commitCardDraft(board, selectedCard.id);
				router.route(`/b/${board.key}/c/${selectedCard.counter}`, {
					replace: true,
					shallow: true,
					onBack: () => {
						selectCard(null);
					},
					onEscape: true,
				});
			}
		}
	});

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

	const columnOptions = $derived(
		board.columns.map(x => ({value: x.id, label: x.name}))
	);

	let assigneeOptions = $derived(
		board.members.map(x => ({value: x.id, label: x.fullName}))
	);
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
				<button
					class="btn--icon ml-auto"
					onclick={() => createCard(undefined)}
				>
					<PlusIcon />
				</button>
				<button class="btn--icon">
					<SearchIcon />
				</button>
				<button onclick={editBoard} class="btn--icon">
					<EllipsisIcon />
				</button>
				<EditBoardDialog
					meId={me.profile.id}
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
					{me}
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
				{#each board.columns as column, i (column.id)}
					<div animate:flip={{duration: DND_REORDER_DURATION_MS}}>
						<BoardColumn
							{column}
							onCardClick={selectCard}
							activeCardId={selectedCard?.id}
							onCreateCard={() => createCard(column)}
							columnPosition={i}
							columnsCount={board.columns.length - 1}
						/>
					</div>
				{/each}
			</div>
		</Scrollable>
	</div>
	{#if selectedCard !== null}
		{#key selectedCard.id}
			<CardDetails
				me={me.profile}
				{awareness}
				card={selectedCard}
				{columnOptions}
				{assigneeOptions}
				onDelete={() => deleteCard(selectedCard!)}
			/>
		{/key}
	{/if}
</main>
