<script lang="ts">
    import {compareNumbers, log, type Awareness} from 'syncwave';
    import {onMount, tick} from 'svelte';
    import BoardColumn from './board-column.svelte';
    import Scrollable from '../components/scrollable.svelte';
    import type {
        BoardTreeView,
        CardView,
        ColumnTreeView,
        MeView,
    } from '../../agent/view.svelte';
    import CardDetails from './card-details.svelte';
    import {getAgent} from '../../agent/agent.svelte';
    import router from '../../router';
    import {flip} from 'svelte/animate';
    import {createDndContext, DND_REORDER_DURATION_MS} from './board-dnd';
    import {yFragmentToPlaintext} from '../../richtext';
    import ResizablePanel from '../components/resizable-panel.svelte';
    import PanelSizeManager from '../../panel-size-manager';
    import Avatar from '../components/avatar.svelte';
    import BoardCommands from './board-commands.svelte';
    import ChevronDownIcon from '../components/icons/chevron-down-icon.svelte';
    import modalManager from '../modal-manager.svelte';
    import BoardSettingsModal from './board-settings-modal.svelte';
    import {COLUMN_WIDTH} from './constants';
    import StatusBar from './status-bar.svelte';
    import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';

    const {
        board,
        awareness,
        me,
        counter,
    }: {
        board: BoardTreeView;
        awareness: Awareness;
        me: MeView;
        counter?: number;
    } = $props();

    const agent = getAgent();

    let selectedCard = $state<CardView | null>(
        counter
            ? (board.columns
                  .flatMap(column => column.cards)
                  .find(card => card.counter === counter) ?? null)
            : null
    );

    onMount(() => {
        if (selectedCard) {
            router.action(() => {
                selectedCard = null;
                router.route(`/b/${board.key}`, {replace: true, shallow: true});
            }, true);
        }
    });

    function selectCard(card: CardView | null) {
        if (selectedCard?.id === card?.id) {
            return;
        }

        if (selectedCard?.isDraft) {
            agent.deleteCard(selectedCard.id);
        }

        const replace = selectedCard !== null;
        selectedCard = card;

        if (card?.isDraft) {
            router.action(() => {
                selectCard(null);
            }, true);
            return;
        }

        if (card) {
            router.route(`/b/${board.key}/c/${card.counter}`, {
                replace,
                shallow: true,
                onBack: () => {
                    selectCard(null);
                },
                onEscape: true,
            });
        } else {
            router.route(`/b/${board.key}`, {
                replace: true,
                shallow: true,
            });
        }
    }

    let boardRef: HTMLElement | null = $state(null);

    $effect(() => {
        if (boardRef && selectedCard) {
            tick().then(() => {
                if (boardRef && selectedCard) {
                    const cardElement = boardRef.querySelector(
                        `[data-card-id="${selectedCard.id}"]`
                    ) as HTMLElement;

                    if (cardElement) {
                        const columnElement =
                            cardElement.closest('[data-column-id]');
                        if (columnElement) {
                            // requestAnimationFrame makes it work in Safari when pointer down => small move => pointer up
                            // it registers like a click (as it should), but Safari doesn't scroll smoothly to the element
                            // in that case for some reason (draggable scrollable and board dnd has nothing to do with it
                            // because it's reproducible even without dnd and draggable scrollable)
                            requestAnimationFrame(() => {
                                columnElement.scrollIntoView({
                                    behavior: 'smooth',
                                    inline: 'nearest',
                                    block: 'nearest',
                                });
                            });
                        }
                    }
                }
            });
        }
    });

    $effect(() => {
        awareness.setLocalStateField('selectedCardId', selectedCard?.id);
    });

    $effect(() => {
        if (board.deletedAt) {
            log.info({
                msg: `board ${board.id} got deleted, redirect to app...`,
            });
            router.route('/');
        }
    });

    async function createCard(column?: ColumnTreeView) {
        if (!column) {
            const firstColumn = board.columns[0];
            if (!firstColumn) {
                alert('Please, create a column to add a card');
                return;
            }

            column = firstColumn;
        }

        if (selectedCard?.isDraft) {
            agent.deleteCard(selectedCard.id);
        }

        const draft = agent.createCardDraft(board, {
            columnId: column.id,
            placement: {
                prev: undefined,
                next: [...column.cards].sort((a, b) =>
                    compareNumbers(a.position, b.position)
                )[0]?.position,
            },
        });

        selectCard(draft);
    }

    async function deleteCard(card: CardView) {
        agent.deleteCard(card.id);
        selectCard(null);
    }

    $effect(() => {
        if (selectedCard?.isDraft) {
            const text = yFragmentToPlaintext(selectedCard.text.__fragment!);
            if (text.length > 0) {
                agent.commitCardDraft(board, selectedCard.id);
                router.route(`/b/${board.key}/c/${selectedCard.counter}`, {
                    replace: true,
                    shallow: true,
                    onBack: () => {
                        selectCard(null);
                    },
                    onEscape: true,
                });
            }
        }
    });

    let columnsContainerRef: HTMLDivElement | null = $state(null);
    let viewportRef: HTMLDivElement | null = $state(null);

    const dndContext = createDndContext(agent);

    $effect(() => {
        if (columnsContainerRef && viewportRef) {
            return dndContext.registerBoard(columnsContainerRef, viewportRef);
        }

        return undefined;
    });

    const columnOptions = $derived(
        board.columns.map(x => ({value: x.id, label: x.name}))
    );

    let assigneeOptions = $derived(
        board.members.map(x => ({value: x.id, label: x.fullName}))
    );

    let detailsWidth = $state(PanelSizeManager.getWidth('right') ?? 424);
</script>

{#snippet boardCommands()}
    <BoardCommands boards={me.boards} />
{/snippet}

{#snippet boardSettings()}
    <BoardSettingsModal {board} />
{/snippet}

<div class="flex w-screen h-screen">
    <div class="flex min-w-0 flex-col">
        <div class="board-header">
            <button
                class="btn-ghost font-medium -ml-1"
                onclick={() => modalManager.open(boardCommands)}
            >
                <span>{board.name}</span>
                <ChevronDownIcon />
            </button>

            <div class="text-2xl text-ink-detail ml-auto flex gap-2">
                {#each board.onlineUsers as user (user.user.id)}
                    <div
                        class={user.state.active ? '' : 'opacity-50'}
                        animate:flip={{duration: 200}}
                    >
                        <Avatar
                            title={`${user.user.fullName} - ${user.state.active ? 'online' : 'away'}`}
                            class="border-blue-400 border-2"
                            name={user.user.fullName}
                        />
                    </div>
                {/each}
            </div>
            <button
                onclick={() => modalManager.open(boardSettings)}
                class="btn--icon text-ink-body mr-1.5"
            >
                <EllipsisIcon />
            </button>

            <button class="btn--icon avatar-sm">
                <Avatar name={me.fullName} />
            </button>
        </div>
        <Scrollable
            orientation="horizontal"
            type="scroll"
            draggable
            bind:viewportRef
        >
            {@const PADDING_X = '0.75rem'}
            <div
                bind:this={boardRef}
                bind:this={columnsContainerRef}
                class="flex board-content"
                style={`padding-right: calc(100vw - ${PADDING_X} - ${COLUMN_WIDTH} - ${selectedCard ? detailsWidth : 0}px); padding-left: ${PADDING_X}`}
            >
                {#each board.columns as column, i (column.id)}
                    <div
                        animate:flip={{duration: DND_REORDER_DURATION_MS}}
                        class="flex-shrink-0"
                    >
                        <BoardColumn
                            {column}
                            onCardClick={selectCard}
                            activeCardId={selectedCard?.id}
                            onCreateCard={() => createCard(column)}
                            columnPosition={i}
                            columnsCount={board.columns.length - 1}
                        />
                    </div>
                {/each}
            </div>
        </Scrollable>
        <div class="board-footer">
            <StatusBar />
        </div>
    </div>
    {#if selectedCard !== null}
        {#key selectedCard.id}
            <ResizablePanel
                freeSide="left"
                defaultSize={detailsWidth}
                minWidth={320}
                maxWidth={1600}
                onWidthChange={w => {
                    detailsWidth = w;
                    PanelSizeManager.saveWidth('right', w);
                }}
            >
                <CardDetails
                    {me}
                    {awareness}
                    card={selectedCard}
                    {columnOptions}
                    {assigneeOptions}
                    onDelete={() => deleteCard(selectedCard!)}
                />
            </ResizablePanel>
        {/key}
    {/if}
</div>

<style>
    :root {
        --header-height: 2.325rem;
        --footer-height: 2.325rem;
        --content-height: calc(
            100vh - var(--header-height) - var(--footer-height)
        );
    }

    .board-header {
        height: var(--header-height);
        display: flex;
        flex-shrink: 0;
        align-items: center;
        padding-inline: 1.25rem;
    }

    .board-content {
        height: var(--content-height);
        overflow-y: auto;
        padding-block-start: 0.5rem;
        padding-block-end: 0rem;
    }

    .board-footer {
        height: var(--footer-height);
        padding-inline: 1.25rem;
        display: flex;
        flex-shrink: 0;
    }
</style>
