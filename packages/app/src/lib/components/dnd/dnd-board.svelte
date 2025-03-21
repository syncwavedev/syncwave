<script lang="ts" generics="T">
	import type {BigFloat, CardId, ColumnId} from 'syncwave-data';
	import type {BoardTreeView} from '../../agent/view.svelte';
	import DndColumn from './dnd-column.svelte';
	import Scrollable from '../../ui/components/scrollable.svelte';
	import {flip} from 'svelte/animate';
	import {getDndBoardContext, createDndContext} from './dnd-context';

	interface Props {
		board: BoardTreeView;
		setColumnPosition: (columnId: ColumnId, position: BigFloat) => void;
		setCardPosition: (
			cardId: CardId,
			columnId: ColumnId,
			position: BigFloat
		) => void;
	}

	let containerRef: HTMLDivElement | null = $state(null);
	let viewportRef: HTMLDivElement | null = $state(null);

	let {board, setCardPosition}: Props = $props();

	const context = createDndContext({
		boardId: board.id,
		setCardPosition,
	});

	$effect(() => {
		if (containerRef) {
			context.container = containerRef;
		}
	});

	$effect(() => {
		if (viewportRef) {
			context.scrollable = viewportRef;
		}
	});
</script>

<Scrollable
	bind:viewportRef
	orientation="horizontal"
	class="flex-grow"
	type="scroll"
	draggable
>
	<div
		bind:this={containerRef}
		class="no-select flex divide-x-[0px] divide-[#dfdfdf] border-y-[0px] border-[#dfdfdf] px-2 text-xs"
	>
		{#each board.columns as column (column.id)}
			<div animate:flip={{duration: 100}}>
				<DndColumn {column} {setCardPosition} />
			</div>
		{/each}
	</div>
</Scrollable>
