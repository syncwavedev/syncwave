<script lang="ts">
	import {observe} from '$lib/utils.svelte';
	import {
		Crdt,
		createCardId,
		createRichtext,
		getNow,
		log,
		stringifyCrdtDiff,
		toPosition,
		type Card,
	} from 'syncwave-data';

	import {goto} from '$app/navigation';
	import BoardViewController from '$lib/components/board-view-controller.svelte';
	import SearchIcon from '$lib/components/icons/search-icon.svelte';
	import PlusIcon from '$lib/components/icons/plus-icon.svelte';
	import ScrollArea from '$lib/components/scroll-area.svelte';
	import EllipsisIcon from '$lib/components/icons/ellipsis-icon.svelte';
	import type {LayoutProps} from './$types';
	import {getAppRoute, getCardRoute} from '$lib/routes';
	import {getSdk} from '$lib/utils';

	const {data, children}: LayoutProps = $props();
	const {boardKey, initialBoard, initialMe} = $derived(data);

	const board = $derived(
		observe(initialBoard, x => x.getBoardView({key: boardKey}))
	);
	const me = $derived(observe(initialMe, x => x.getMe({})));

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

		const card = await sdk(x =>
			x.createCard({diff: stringifyCrdtDiff(cardCrdt.state())})
		);

		goto(getCardRoute(boardKey, card.counter));
	}
</script>

<div class="flex h-full">
	<div class="flex h-full min-w-0 flex-1 flex-col">
		<div class="sticky top-0 z-10 shrink-0 px-6">
			<div class="bg-subtle-1 dark:bg-subtle-0 sticky top-0 z-10">
				<div class="my-2 flex items-center">
					<div class="text-xs leading-none font-semibold capitalize">
						{board.value.name}
					</div>

					<button onclick={createCard} class="btn--icon ml-auto">
						<PlusIcon />
					</button>
					<button class="btn--icon"><SearchIcon /></button>
					<button class="btn--icon -mr-2"><EllipsisIcon /></button>
				</div>
			</div>
		</div>

		<div class="min-h-0 flex-1">
			<ScrollArea
				draggable
				orientation="both"
				type="always"
				class="h-full"
			>
				<div class="px-6">
					<BoardViewController board={board.value} />
				</div>
			</ScrollArea>
		</div>
	</div>

	{@render children()}
</div>
