<script lang="ts" generics="T">
	import {type BigFloat, type CardId, type ColumnId} from 'syncwave-data';
	import type {CardView} from '../../agent/view.svelte';
	import CardTile from '../../ui/boards/card-tile.svelte';
	import {getDndBoardContext, type Ref} from './dnd-context';

	interface Props {
		card: CardView;
		setCardPosition: (
			cardId: CardId,
			columnId: ColumnId,
			position: BigFloat
		) => void;
	}

	let containerRef: HTMLDivElement | null = $state(null);

	let {card}: Props = $props();
	let cardRef: Ref<CardView> = {value: card};
	$effect(() => {
		cardRef.value = card;
	});

	const context = getDndBoardContext();
	$effect(() => {
		if (containerRef) {
			return context.registerCard({
				card: cardRef,
				container: containerRef,
				cleanups: [],
			});
		}

		return undefined;
	});
</script>

<div
	bind:this={containerRef}
	class="select-none text-xs card-container relative"
	data-disable-scroll-view-drag="true"
>
	<div class="content">
		<CardTile {card} onClick={() => {}} active={false} />
	</div>

	<div class="overlay"></div>
</div>

<style>
	:global {
		.card-container[data-dnd-placeholder='true'] {
			> .overlay {
				position: absolute;
				inset: 5px;
				border: 1px solid #ddd;
				background-color: #eee;
				border-radius: 5px;
				z-index: 0;
			}

			> .content {
				opacity: 0;
				pointer-events: none;
			}
		}
	}
</style>
