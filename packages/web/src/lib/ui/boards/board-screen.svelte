<script lang="ts">
	import {observe} from '$lib/utils.svelte';
	import {
		Crdt,
		createCardId,
		createRichtext,
		getNow,
		log,
		toPosition,
		type BoardViewDataDto,
		type Card,
		type Identity,
		type UserDto,
	} from 'syncwave-data';

	import {goto} from '$app/navigation';
	import {getAppRoute} from '$lib/routes';
	import {getSdk} from '$lib/utils';
	import {tick, type Snippet} from 'svelte';
	import PlusIcon from '../components/icons/plus-icon.svelte';
	import SearchIcon from '../components/icons/search-icon.svelte';
	import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
	import BoardColumn from './board-column.svelte';
	import appNavigator from '../app-navigator';
	import {useBoardView} from './use-board-view.svelte';
	import {dragHandleZone} from 'svelte-dnd-action';
	import Scrollable from '../components/scrollable.svelte';
	import {observeBoard} from '$lib/sdk/sdk.svelte';
	import type {CardView} from '$lib/sdk/view.svelte';
	import CardDetailsWrapper from './card-details-wrapper.svelte';

	const {
		boardKey,
		initialBoard,
		initialMe,
	}: {
		children: Snippet;
		boardKey: string;
		initialBoard: BoardViewDataDto;
		initialMe: {
			user: UserDto;
			identity: Identity;
		};
	} = $props();
	const board = observeBoard(boardKey, initialBoard);
	const {
		columns,
		handleDndConsiderColumns,
		handleDndFinalizeColumns,
		createCardHandler,
	} = useBoardView({value: board});

	const me = observe(initialMe, x => x.getMe({}));

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
							inline: 'center',
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

	const sdk = getSdk();

	async function createCard() {
		const firstColumn = board.columns[0];
		if (firstColumn === undefined) {
			alert('Please, create a column first');
			return;
		}

		const now = getNow();
		const cardId = createCardId();
		const cardCrdt = Crdt.from<Card>({
			authorId: me.value.user.id,
			boardId: board.id,
			columnId: board.columns[0].id,
			createdAt: now,
			deleted: false,
			id: cardId,
			columnPosition: toPosition({next: undefined, prev: undefined}),
			counter: 0,
			pk: [cardId],
			updatedAt: now,
			text: createRichtext(),
		});

		await sdk(x => x.createCard({diff: cardCrdt.state()}));
	}
</script>

<main class="flex h-screen w-full">
	<div class="bg-subtle-1 dark:bg-subtle-0 flex min-w-0 grow flex-col">
		<!-- Fixed Header -->
		<div class="bg-subtle-1 dark:bg-subtle-0 px-4">
			<div class="my-1 flex items-center">
				<div class="text-xs leading-none font-medium">{board.name}</div>
				<button class="btn--icon ml-auto" onclick={createCard}>
					<PlusIcon />
				</button>
				<button class="btn--icon">
					<SearchIcon />
				</button>
				<button class="btn--icon">
					<EllipsisIcon />
				</button>
			</div>
		</div>
		<Scrollable orientation="horizontal" class="flex-grow" type="scroll">
			<div
				bind:this={boardRef}
				class="flex gap-1.5 px-4 pb-2 text-xs"
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
			<CardDetailsWrapper initialCard={selectedCard} />
		{/key}
	{/if}
</main>
