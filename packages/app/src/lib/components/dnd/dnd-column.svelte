<script lang="ts" generics="T">
	import type {BigFloat, CardId, ColumnId} from 'syncwave-data';
	import type {ColumnTreeView, ColumnView} from '../../agent/view.svelte';
	import Scrollable from '../../ui/components/scrollable.svelte';
	import CardTile from '../../ui/boards/card-tile.svelte';
	import {flip} from 'svelte/animate';
	import EllipsisIcon from '../icons/ellipsis-icon.svelte';
	import PlusIcon from '../icons/plus-icon.svelte';
	import {getDndBoardContext, type Ref} from './dnd-context';
	import DndCard from './dnd-card.svelte';

	interface Props {
		column: ColumnTreeView;
		setCardPosition: (
			cardId: CardId,
			columnId: ColumnId,
			position: BigFloat
		) => void;
	}

	let containerRef: HTMLDivElement | null = $state(null);
	let viewportRef: HTMLDivElement | null = $state(null);

	let {column, setCardPosition}: Props = $props();
	let columnRef: Ref<ColumnView> = {value: column};
	$effect(() => {
		columnRef.value = column;
	});

	const context = getDndBoardContext();
	$effect(() => {
		if (containerRef && viewportRef) {
			return context.registerColumn({
				column: columnRef,
				container: containerRef,
				scrollable: viewportRef,
				cleanups: [],
			});
		}

		return undefined;
	});
</script>

<Scrollable
	bind:viewportRef
	orientation="vertical"
	viewportClass="h-full max-h-[calc(100vh-8rem)] min-h-[calc(100vh-8rem)]"
	type="scroll"
>
	<div
		class="flex w-80 flex-shrink-0 flex-col pb-1"
		data-column-id={column.id}
	>
		<div
			class="dark:bg-subtle-0 bg-subtle-1 sticky top-0 flex min-h-10 items-center px-2 py-1"
			data-disable-scroll-view-drag="true"
		>
			<div class="text-2xs font-medium">
				{column.name}
			</div>
			<button class="btn--icon ml-auto">
				<EllipsisIcon class="pointer-events-none" />
			</button>
			<button class="btn--icon">
				<PlusIcon />
			</button>
		</div>

		<div
			class="mx-2 flex h-full min-h-10 flex-col gap-1.5"
			bind:this={containerRef}
		>
			{#each column.cards as card (card.id)}
				<div animate:flip={{duration: 300}}>
					<DndCard {card} {setCardPosition} />
				</div>
			{/each}
		</div>
	</div>
</Scrollable>
