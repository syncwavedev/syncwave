<script lang="ts">
    import CardTile from './card-tile.svelte';
    import Scrollable from '../components/scrollable.svelte';
    import type {
        CardView,
        ColumnView,
        ColumnTreeView,
    } from '../../agent/view.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';
    import EllipsisIcon from '../../components/icons/ellipsis-icon.svelte';
    import EditColumnDialog from '../../components/edit-column-dialog/edit-column-dialog.svelte';
    import {DND_CARD_GAP, getDndBoardContext, type Ref} from './board-dnd';
    import router from '../../router';
    import ListAnimator from '../components/list-animator.svelte';
    import ColumnIcon from '../components/column-icon.svelte';

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
</script>

<Scrollable
    bind:viewportRef
    orientation="vertical"
    viewportClass="h-full max-h-[calc(100vh-8rem)] min-h-[calc(100vh-2.5rem)]"
    type="hover"
>
    <div
        class="flex w-80 flex-shrink-0 flex-col pb-1"
        data-column-id={column.id}
    >
        <div
            class="bg-surface-0 sticky top-0 z-1 flex min-h-10 items-center px-2 py-1 text-2xs icon-2xs"
            data-disable-scroll-view-drag="true"
        >
            <div class="font-medium flex items-center gap-1.5">
                <ColumnIcon active={columnPosition} total={columnsCount} />

                {column.name}
            </div>

            <EditColumnDialog
                {column}
                open={editColumnOpen}
                onClose={() => (editColumnOpen = false)}
            />
            <button class="btn--icon ml-auto" onclick={onCreateCard}>
                <PlusIcon class="pointer-events-none" />
            </button>
            <button onclick={editColumn} class="btn--icon">
                <EllipsisIcon class="pointer-events-none" />
            </button>
        </div>

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
                    <div class="text-xs" data-disable-scroll-view-drag="true">
                        <CardTile
                            {card}
                            onClick={() => onCardClick(card)}
                            active={card.id === activeCardId}
                        />
                    </div>
                {/snippet}
            </ListAnimator>
        </div>
    </div>
</Scrollable>
