<script lang="ts">
	import {observe} from '$lib/utils.svelte';
	import {
		Crdt,
		createCardId,
		createRichtext,
		getNow,
		log,
		toPosition,
		type BoardViewDto,
		type Card,
		type Identity,
		type UserDto,
	} from 'syncwave-data';

	import {goto} from '$app/navigation';
	import {getAppRoute, getCardRoute} from '$lib/routes';
	import {getSdk} from '$lib/utils';
	import type {Snippet} from 'svelte';
	import PlusIcon from '../components/icons/plus-icon.svelte';
	import SearchIcon from '../components/icons/search-icon.svelte';
	import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
	import BoardColumn from './board-column.svelte';

	const {
		boardKey,
		initialBoard,
		initialMe,
	}: {
		children: Snippet;
		boardKey: string;
		initialBoard: BoardViewDto;
		initialMe: {
			user: UserDto;
			identity: Identity;
		};
	} = $props();

	const board = observe(initialBoard, x => x.getBoardView({key: boardKey}));
	const me = observe(initialMe, x => x.getMe({}));

	$effect(() => {
		if (board.value.deleted) {
			log.info(`board ${board.value.id} got deleted, redirect to app...`);
			goto(getAppRoute());
		}
	});

	const sdk = getSdk();

	async function createCard() {
		const firstColumn = board.value.columns[0];
		if (firstColumn === undefined) {
			alert('Please, create a column first');
			return;
		}

		const now = getNow();
		const cardId = createCardId();
		const cardCrdt = Crdt.from<Card>({
			authorId: me.value.user.id,
			boardId: board.value.id,
			columnId: board.value.columns[0].id,
			createdAt: now,
			deleted: false,
			id: cardId,
			columnPosition: toPosition({next: undefined, prev: undefined}),
			counter: 0,
			pk: [cardId],
			updatedAt: now,
			text: createRichtext(),
		});

		const card = await sdk(x => x.createCard({diff: cardCrdt.state()}));

		goto(getCardRoute(boardKey, card.counter));
	}
</script>

<main class="flex h-screen w-full">
	<div class="bg-subtle-1 dark:bg-subtle-0 flex min-w-0 grow flex-col">
		<!-- Fixed Header -->
		<div
			class="bg-subtle-1 dark:bg-subtle-0 border-divider sticky top-0 z-10 border-b px-4"
		>
			<div class="my-1 flex items-center">
				<div class="text-xs leading-none">{board.value.name}</div>
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
		<div class="mt-4 flex-1 overflow-x-auto px-4 pb-4">
			<div class="flex gap-4 text-xs">
				{#each board.value.columns as column (column.id)}
					<BoardColumn {column} />
				{/each}
			</div>
		</div>
	</div>
</main>
