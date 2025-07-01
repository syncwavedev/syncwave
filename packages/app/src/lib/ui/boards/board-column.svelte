<script lang="ts">
    import CardTile from './card-tile.svelte';
    import Scrollable from '../components/scrollable.svelte';
    import type {
        CardTreeView,
        ColumnView,
        ColumnTreeView,
    } from '../../agent/view.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';
    import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
    import {DND_CARD_GAP, getDndBoardContext, type Ref} from './board-dnd';
    import ListAnimator from '../components/list-animator.svelte';
    import ColumnIcon from '../components/column-icon.svelte';
    import permissionManager from '../../../permission-manager';

    const {
        column,
        onCardClick,
        onCreateCard,
        onEditColumn,
        activeCardId,
        columnsCount,
        columnPosition,
        searchValue,
    }: {
        column: ColumnTreeView;
        onCardClick: (card: CardTreeView) => void;
        activeCardId?: string;
        onCreateCard: () => void;
        onEditColumn: () => void;
        columnsCount: number;
        columnPosition: number;
        searchValue: string;
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
        class="flex items-center column-padding-inline mt-3.5 mb-2.5 shrink-0"
        data-disable-scroll-view-drag="true"
    >
        <div
            class="flex items-center gap-1.5 leading-none font-medium indicator"
        >
            <ColumnIcon active={columnPosition} total={columnsCount} />

            {column.name}
        </div>

        {#if permissionManager.hasPermission('write:card')}
            <div class="flex ml-auto btn--small">
                <button class="btn btn--icon" onclick={onCreateCard}>
                    <PlusIcon />
                </button>
                {#if permissionManager.hasPermission('write:board')}
                    <button onclick={onEditColumn} class="btn btn--icon">
                        <EllipsisIcon />
                    </button>
                {/if}
            </div>
        {/if}
    </div>

    <Scrollable
        bind:viewportRef
        class="relative min-h-0 flex-grow"
        viewportClass="max-h-full"
        orientation="vertical"
        type="hover"
    >
        <div
            class="column-padding-inline min-h-10 py-1"
            bind:this={cardsContainerRef}
        >
            <ListAnimator
                items={column.cards.filter(
                    card =>
                        card.plainText
                            .toLowerCase()
                            .includes(searchValue.trim().toLowerCase()) ||
                        `#${card.counter}`.includes(
                            searchValue.trim().toLowerCase()
                        )
                )}
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
    .indicator {
        --icon-size: 1.4em;
    }

    .column {
        display: flex;
        flex-shrink: 0;
        flex-direction: column;

        max-height: 100%;
        width: var(--column-width);
    }

    .column-padding-inline {
        margin-inline: var(--column-padding-inline);
    }
</style>
