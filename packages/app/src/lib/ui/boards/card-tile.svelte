<script lang="ts">
    import {yFragmentToPlaintextAndTaskList} from '../../richtext';
    import Avatar from '../components/avatar.svelte';
    import type {CardView} from '../../agent/view.svelte';
    import {getAgent} from '../../agent/agent';
    import {
        DND_REORDER_DURATION_MS,
        getDndBoardContext,
        type Ref,
    } from './board-dnd';
    import {getNow} from 'syncwave';
    import HashtagIcon from '../components/icons/hashtag-icon.svelte';

    const {
        card,
        onClick,
        active,
    }: {
        card: CardView;
        onClick: () => void;
        active: boolean;
    } = $props();

    let {preview, todoStats} = $derived.by(() => {
        const {text, checked, total} = yFragmentToPlaintextAndTaskList(
            card.text.__fragment!
        );

        return {
            preview: text.split('\n')[0]?.trim() || 'Untitled',
            todoStats: {
                checked,
                total,
            },
        };
    });

    const agent = getAgent();

    let containerRef: HTMLDivElement | null = $state(null);
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

    const SETTLED_MS = DND_REORDER_DURATION_MS / 2;
    let isDndSettled = $state(
        !!card.dndLastChangeAt && getNow() - card.dndLastChangeAt < SETTLED_MS
    );
    $effect(() => {
        if (card.dndLastChangeAt === undefined) return;
        isDndSettled = false;
        const timeoutId = setTimeout(
            () => {
                isDndSettled = true;
            },
            Math.max(0, card.dndLastChangeAt + SETTLED_MS - getNow())
        );

        return () => {
            isDndSettled = false;
            clearTimeout(timeoutId);
        };
    });
</script>

<div
    class="card-container relative"
    bind:this={containerRef}
    data-is-dnd-in-progress={card.dndInProgress}
    data-dnd-settled={isDndSettled}
    data-disable-scroll-view-drag="true"
>
    <div
        data-card-id={card.id}
        role="button"
        tabindex="0"
        data-active={active || undefined}
        class="
        bg-surface-3
        dark:bg-surface-2
        dark:hover:bg-surface-3
        hover:bg-surface-4
        group
        data-active:bg-subtle-active
        flex
        items-end
        cursor-default
        gap-1
        rounded-md
        p-2.5
        select-none
        content
    "
        class:border-dashed={card.isDraft}
        onclick={onClick}
        onmouseenter={() => agent.handleCardMouseEnter(card.boardId, card.id)}
        onmouseleave={() => agent.handleCardMouseLeave(card.boardId, card.id)}
        onkeydown={e => e.key === 'Enter' && onClick()}
    >
        <div class="flex w-full flex-col gap-1 truncate">
            <div
                class="flex items-center"
                class:h-6={card.isDraft}
                data-active={active || undefined}
            >
                {#if !card.isDraft}
                    <span class="truncate text-lg">
                        {preview}
                    </span>
                {/if}
            </div>
            {#if !card.isDraft}
                <div class="flex items-center icon-base text-ink-detail">
                    {#if card.counter}
                        <HashtagIcon />{card.counter}
                    {/if}
                    by {card.author.fullName}
                    {#if card.hoverUsers.length > 0}
                        hovers {card.hoverUsers.map(x => x.fullName).join(', ')}
                    {/if}
                    {#if card.viewerUsers.length > 0}
                        viewers {card.viewerUsers
                            .map(x => x.fullName)
                            .join(', ')}
                    {/if}
                    {#if todoStats.total > 0}
                        <span class="text-ink-detail ml-auto">
                            {todoStats.checked} / {todoStats.total}
                        </span>
                    {/if}
                    <span
                        class="ml-2 avatar-sm"
                        class:ml-auto={todoStats.total == 0}
                    >
                        <Avatar name={card.assignee?.fullName ?? 'Unknown'} />
                    </span>
                </div>
            {/if}
        </div>
    </div>
    <div class="overlay"></div>
</div>

<style>
    .card-container[data-is-dnd-in-progress='true'] {
        > .overlay {
            position: absolute;
            inset: 5px;
            border-radius: 5px;
            border: 1px solid #ccc;
            background-color: #eee;
            opacity: 0;
        }

        &[data-dnd-settled='true'] > .overlay {
            transition: opacity 0.5s;
            opacity: 0.5;
        }

        > .content {
            opacity: 0;
            pointer-events: none;
        }
    }
</style>
