<script lang="ts">
    import CardTile from './card-tile.svelte';
    import Scrollable from '../components/scrollable.svelte';
    import type {
        CardView,
        ColumnView,
        ColumnTreeView,
    } from '../../agent/view.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';
    import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
    import {DND_CARD_GAP, getDndBoardContext, type Ref} from './board-dnd';
    import ListAnimator from '../components/list-animator.svelte';
    import ColumnIcon from '../components/column-icon.svelte';

    const {
        column,
        onCardClick,
        onCreateCard,
        onEditColumn,
        activeCardId,
        columnsCount,
        columnPosition,
    }: {
        column: ColumnTreeView;
        onCardClick: (card: CardView) => void;
        activeCardId?: string;
        onCreateCard: () => void;
        onEditColumn: () => void;
        columnsCount: number;
        columnPosition: number;
    } = $props();

    let cardsContainerRef: HTMLDivElement | null = $state(null);
    let viewportRef: HTMLDivElement | null = $state(null);
    let columnRef: Ref<ColumnView> = {value: column};
    $effect(() => {
        columnRef.value = column;
    });

    const context = getDndBoardContext();
    $effect(() => {
        if (cardsContainerRef && viewportRef) {
            return context.registerColumn({
                column: columnRef,
                container: cardsContainerRef,
                scrollable: viewportRef,
                cleanups: [],
            });
        }

        return undefined;
    });
</script>

<div class="column" data-column-id={column.id}>
    <div
        class="flex items-center column-padding-inline my-2 flex-shrink-0 icon-sm text-sm font-semibold"
        data-disable-scroll-view-drag="true"
    >
        <div class="flex items-center gap-1.5 leading-none">
            <ColumnIcon active={columnPosition} total={columnsCount} />

            {column.name}
        </div>

        <div class="flex ml-auto text-ink-body">
            <button class="btn--icon" onclick={onCreateCard}>
                <PlusIcon class="pointer-events-none" />
            </button>
            <button onclick={onEditColumn} class="btn--icon">
                <EllipsisIcon class="pointer-events-none" />
            </button>
        </div>
    </div>

    <Scrollable
        bind:viewportRef
        viewportClass="max-h-full"
        class="flex-grow overflow-y-auto relative"
        orientation="vertical"
        type="hover"
    >
        <div
            class="column-padding-inline flex h-full min-h-10 flex-col gap-1.5"
            bind:this={cardsContainerRef}
        >
            <ListAnimator
                items={column.cards}
                gap={DND_CARD_GAP}
                key={item => item.id}
            >
                {#snippet renderItem(card)}
                    <div data-disable-scroll-view-drag="true">
                        <CardTile
                            {card}
                            onClick={() => onCardClick(card)}
                            active={card.id === activeCardId}
                        />
                    </div>
                {/snippet}
            </ListAnimator>
        </div>
    </Scrollable>
</div>

<style>
    .column {
        display: flex;
        flex-shrink: 0;
        flex-direction: column;

        height: 100%;
        width: var(--column-width);
    }

    .column-padding-inline {
        margin-inline: var(--column-padding-inline);
    }
</style>
