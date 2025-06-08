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
    import {createDndContext} from './board-dnd';
    import ResizablePanel from '../components/resizable-panel.svelte';
    import Avatar from '../components/avatar.svelte';
    import BoardCommands from './board-commands.svelte';
    import modalManager from '../modal-manager.svelte';
    import BoardSettingsModal from './board-settings-modal.svelte';
    import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
    import permissionManager from '../../../permission-manager';
    import {flip} from 'svelte/animate';
    import {DND_REORDER_DURATION_MS} from './board-dnd';
    import {toastManager} from '../../../toast-manager.svelte';
    import DropdownMenu from '../components/dropdown-menu.svelte';
    import DoorOpenIcon from '../components/icons/door-open-icon.svelte';
    import BoardIcon from '../components/icons/board-icon.svelte';
    import BoardHistoryManager from '../../board-history-manager';
    import {panelSizeManager} from '../../panel-size-manager.svelte';
    import TimesIcon from '../components/icons/times-icon.svelte';
    import SearchIcon from '../components/icons/search-icon.svelte';
    import ActivityBar from './activity-bar.svelte';

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
            if (selectedCard.plainText.length > 0) {
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

    let isSearch = $state(false);
    let searchValue = $state('');

    function onStartSearch() {
        isSearch = true;

        router.action(() => {
            onCloseSearch();
        }, true);
    }

    function onCloseSearch() {
        searchValue = '';
        isSearch = false;
    }
</script>

{#snippet boardSettings()}
    <BoardSettingsModal {board} {me} />
{/snippet}

{#snippet header()}
    <div class="flex flex-col gap-1">
        <p class="font-semibold">{board.name}</p>
        <p class="text-ink-detail text-xs">6 members + 2 guests</p>
    </div>

    <div class="ml-2 flex">
        {#each board.onlineUsers as user (user.user.id)}
            <Avatar
                userId={user.user.id}
                imageUrl={user.user.avatarUrlSmall}
                name={`${user.user.fullName}`}
                class="outline-material-base outline-2"
            />
        {/each}
    </div>

    {#if me.isDemo}
        <div class="ml-2 text-orange-600 dark:text-orange-400 font-medium">
            Showcase Board
        </div>
        <a href="/login" class="ml-auto">
            <button class="btn--ghost">Sign In</button>
        </a>
    {:else}
        <div class="ml-auto flex">
            <button class="btn--icon" onclick={onStartSearch}>
                <SearchIcon />
            </button>
            <DropdownMenu
                items={[
                    permissionManager.hasPermission('write:board')
                        ? {
                              icon: BoardIcon,
                              text: 'Board Settings',
                              onSelect: () => {
                                  modalManager.open(boardSettings);
                              },
                          }
                        : null,
                    {
                        icon: DoorOpenIcon,
                        text: 'Leave Board',
                        onSelect: () => {
                            const confirmMessage = `Are you sure you want to leave "${board.name}"? You'll lose access to this board.`;
                            if (confirm(confirmMessage)) {
                                BoardHistoryManager.clear();
                                agent.deleteMember(board.memberId);
                                router.route('/');
                            }
                        },
                    },
                ]}
            >
                <button class="btn--icon">
                    <EllipsisIcon />
                </button>
            </DropdownMenu>
        </div>
    {/if}
{/snippet}

{#snippet searchHeader()}
    <!-- svelte-ignore a11y_autofocus -->
    <input
        type="text"
        class="input"
        placeholder="Search..."
        bind:value={searchValue}
        autofocus
    />
    <button class="btn--icon" onclick={onCloseSearch}>
        <TimesIcon />
    </button>
{/snippet}

<div class="app flex">
    <ActivityBar {me} {board} boards={me.boards} />
    <div class="relative flex min-w-0 flex-col flex-1">
        <div
            class="flex items-center shrink-0 px-board-inline h-panel-header avatar-xs"
        >
            {#if !isSearch}
                {@render header()}
            {:else}
                {@render searchHeader()}
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
                    ? `calc(var(--board-padding-inline-end) - ${0}px)`
                    : 'var(--board-padding-inline-end)'}"
            >
                {#each board.columns as column, i (column.id)}
                    <div
                        class="flex"
                        animate:flip={{duration: DND_REORDER_DURATION_MS}}
                    >
                        <BoardColumn
                            {column}
                            onCardClick={selectCard}
                            activeCardId={selectedCard?.id}
                            onCreateCard={() => createCard(column)}
                            onEditColumn={() =>
                                toastManager.info(
                                    'Not implementd',
                                    'Wait until we will ad this feater'
                                )}
                            columnPosition={i}
                            columnsCount={board.columns.length - 1}
                            {searchValue}
                        />
                    </div>
                {/each}
            </div>
        </Scrollable>
    </div>
    {#if selectedCard !== null}
        {#key selectedCard.id}
            <ResizablePanel
                class="max-h-full overflow-auto"
                freeSide="left"
                width={panelSizeManager.getWidth('card_details') ?? 422}
                minWidth={320}
                maxWidth={1600}
                onWidthChange={w =>
                    panelSizeManager.setWidth('card_details', w)}
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

        display: flex;

        padding-inline-start: var(--board-padding-inline-start);
    }
</style>
