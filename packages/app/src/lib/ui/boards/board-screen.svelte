<script lang="ts">
    import {compareNumbers, log, type Awareness} from 'syncwave';
    import {onMount, tick} from 'svelte';
    import BoardColumn from './board-column.svelte';
    import Scrollable from '../components/scrollable.svelte';
    import type {
        BoardTreeView,
        CardTreeView,
        ColumnTreeView,
        MemberView,
        MeView,
    } from '../../agent/view.svelte';
    import CardDetails from './card-details.svelte';
    import {getAgent} from '../../agent/agent.svelte';
    import router from '../../router';
    import {flip} from 'svelte/animate';
    import {createDndContext, DND_REORDER_DURATION_MS} from './board-dnd';
    import {yFragmentToPlaintext} from 'syncwave';
    import ResizablePanel from '../components/resizable-panel.svelte';
    import PanelSizeManager from '../../panel-size-manager';
    import Avatar from '../components/avatar.svelte';
    import BoardCommands from './board-commands.svelte';
    import ChevronDownIcon from '../components/icons/chevron-down-icon.svelte';
    import modalManager from '../modal-manager.svelte';
    import BoardSettingsModal from './board-settings-modal.svelte';
    import StatusBar from './status-bar.svelte';
    import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
    import ProfileModal from '../profiles/profile-modal.svelte';
    import permissionManager from '../../../permission-manager';

    const {
        board,
        awareness,
        boardMeView,
        me,
        counter,
    }: {
        board: BoardTreeView;
        awareness: Awareness;
        me: MeView;
        boardMeView: MemberView;
        counter?: number;
    } = $props();

    const agent = getAgent();

    let selectedCard = $state<CardTreeView | null>(
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

    function selectCard(card: CardTreeView | null) {
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

    async function deleteCard(card: CardTreeView) {
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
    <BoardSettingsModal {board} {me} />
{/snippet}

{#snippet profileSettings()}
    <ProfileModal {me} />
{/snippet}

<div class="app flex">
    <div class="relative flex min-w-0 flex-col flex-1">
        <div class="panel-header avatar-sm">
            <button
                class="btn--ghost font-medium"
                onclick={() => modalManager.open(boardCommands)}
            >
                <span>{board.name}</span>
                <ChevronDownIcon />
            </button>

            <div class="ml-2 flex">
                {#each board.onlineUsers as user (user.user.id)}
                    <Avatar
                        userId={user.user.id}
                        name={`${user.user.fullName}`}
                        class="outline-material-base outline-2"
                    />
                {/each}
            </div>

            {#if me.isDemo}
                <div
                    class="ml-2 text-orange-600 dark:text-orange-400 font-medium"
                >
                    Showcase Board
                </div>
                <a href="/login" class="ml-auto">
                    <button class="btn--ghost">Sign In</button>
                </a>
            {:else}
                <div class="ml-auto flex gap-1">
                    {#if permissionManager.hasPermission('write:board')}
                        <button
                            onclick={() => modalManager.open(boardSettings)}
                            class="btn--icon text-ink-body"
                        >
                            <EllipsisIcon />
                        </button>
                    {/if}

                    <button
                        class="btn--icon"
                        onclick={() => modalManager.open(profileSettings)}
                    >
                        <Avatar userId={me.id} name={me.fullName} />
                    </button>
                </div>
            {/if}
        </div>
        <Scrollable
            orientation="horizontal"
            type="scroll"
            draggable
            bind:viewportRef
        >
            <div
                bind:this={boardRef}
                bind:this={columnsContainerRef}
                class="board-content"
                style="padding-inline-end: {selectedCard
                    ? `calc(var(--board-padding-inline-end) - ${detailsWidth}px)`
                    : 'var(--board-padding-inline-end)'}"
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
                            onEditColumn={() => {}}
                            columnPosition={i}
                            columnsCount={board.columns.length - 1}
                        />
                    </div>
                {/each}
            </div>
        </Scrollable>
        <div class="panel-footer">
            <StatusBar />
        </div>
    </div>
    {#if selectedCard !== null}
        {#key selectedCard.id}
            <ResizablePanel
                class="max-h-full overflow-auto"
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
                    me={boardMeView}
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
    .board-content {
        height: var(--board-height);
        overflow-y: auto;
        display: flex;

        padding-inline-start: var(--board-padding-inline-start);
    }
</style>
