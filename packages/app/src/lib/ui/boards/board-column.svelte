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
    import EditColumnDialog from '../../components/edit-column-dialog/edit-column-dialog.svelte';
    import {DND_CARD_GAP, getDndBoardContext, type Ref} from './board-dnd';
    import router from '../../router';
    import ListAnimator from '../components/list-animator.svelte';
    import ColumnIcon from '../components/column-icon.svelte';
    import {COLUMN_WIDTH} from './constants';

    const {
        column,
        onCardClick,
        onCreateCard,
        activeCardId,
        columnsCount,
        columnPosition,
    }: {
        column: ColumnTreeView;
        onCardClick: (card: CardView) => void;
        activeCardId?: string;
        onCreateCard: () => void;
        columnsCount: number;
        columnPosition: number;
    } = $props();

    let editColumnOpen = $state(false);

    function editColumn() {
        editColumnOpen = true;

        router.action(() => {
            editColumnOpen = false;
        }, true);
    }

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

    let hasTopScroll = $state(false);
    let hasBottomScroll = $state(false);
</script>

<div
    class="flex flex-shrink-0 flex-col h-full"
    style={`width: ${COLUMN_WIDTH}`}
    data-column-id={column.id}
>
    <div
        class="flex items-center px-2 mb-2 flex-shrink-0"
        data-disable-scroll-view-drag="true"
    >
        <div class="flex items-center gap-1.5 font-medium icon-sm">
            <ColumnIcon active={columnPosition} total={columnsCount} />

            {column.name}
        </div>

        <EditColumnDialog
            {column}
            open={editColumnOpen}
            onClose={() => (editColumnOpen = false)}
        />
        <div class="flex ml-auto icon-sm">
            <button class="btn--icon text-ink-body" onclick={onCreateCard}>
                <PlusIcon class="pointer-events-none" />
            </button>
            <button onclick={editColumn} class="btn--icon text-ink-body">
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
        bind:hasTopScroll
        bind:hasBottomScroll
    >
        <div
            class="absolute top-0 left-0 bg-gradient-to-b from-surface-0/80 to-transparent h-8 w-full z-20"
            class:invisible={!hasTopScroll}
        ></div>
        <div
            class="absolute bottom-0 left-0 bg-gradient-to-t from-surface-0/80 to-transparent h-8 w-full z-20"
            class:invisible={!hasBottomScroll}
        ></div>
        <div
            class="mx-2 flex h-full min-h-10 flex-col gap-1.5"
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
