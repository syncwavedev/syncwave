<script lang="ts">
    import {yFragmentToPlaintextAndTaskList} from 'syncwave';
    import Avatar from '../components/avatar.svelte';
    import type {CardTreeView} from '../../agent/view.svelte';
    import {getAgent} from '../../agent/agent.svelte';
    import {
        DND_REORDER_DURATION_MS,
        getDndBoardContext,
        type Ref,
    } from './board-dnd';
    import {getNow} from 'syncwave';
    import HashtagIcon from '../components/icons/hashtag-icon.svelte';
    import UserIconSolid from '../components/icons/user-icon-solid.svelte';

    const {
        card,
        onClick,
        active,
    }: {
        card: CardTreeView;
        onClick: () => void;
        active: boolean;
    } = $props();

    let {preview, todoStats} = $derived.by(() => {
        const {text, checked, total} = yFragmentToPlaintextAndTaskList(
            card.text.__fragment!
        );

        return {
            preview:
                text
                    .split('\n')
                    .map(x => x.trim())
                    .find(x => x.length > 0) ?? 'Untitled',
            todoStats: {
                checked,
                total,
                left: total - checked,
            },
        };
    });

    const agent = getAgent();

    let containerRef: HTMLDivElement | null = $state(null);
    let cardRef: Ref<CardTreeView> = {value: card};
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
            bg-gray-40
            dark:bg-gray-775
            hover:bg-gray-75
            dark:hover:bg-gray-750
            group
            flex
            items-end
            cursor-default
            gap-1
            rounded-md
            p-2.5
            content
            outline-offset-[-2px]
            data-active:outline-2
            data-active:outline-divider-active
            focus:outline-2
            focus:outline-divider-active/50
        "
        class:border-dashed={card.isDraft}
        onclick={onClick}
        onmouseenter={() => agent.handleCardMouseEnter(card.boardId, card.id)}
        onmouseleave={() => agent.handleCardMouseLeave(card.boardId, card.id)}
        onkeydown={e => e.key === 'Enter' && onClick()}
    >
        <div class="flex w-full flex-col gap-1.5 truncate">
            <div
                class="flex items-center"
                class:h-6={card.isDraft}
                data-active={active || undefined}
            >
                {#if !card.isDraft}
                    <span class="truncate font-medium">
                        {preview}
                    </span>
                {/if}
            </div>
            {#if !card.isDraft}
                <div class="flex items-center icon-base text-ink-detail">
                    {#if card.counter}
                        <HashtagIcon />{card.counter}
                    {/if}
                    {#if card.viewerUsers.length > 0}
                        <div class="ml-2 flex avatar-sm">
                            {#each card.viewerUsers as user (user.id)}
                                <Avatar
                                    userId={user.id}
                                    name={`${user.fullName}`}
                                    imageUrl={user.avatarUrlSmall}
                                    class="outline-gray-75 dark:outline-gray-825 outline-2"
                                />
                            {/each}
                        </div>
                    {/if}
                    {#if todoStats.total > 0}
                        <span class="text-ink-detail ml-auto text-sm">
                            {#if todoStats.left === 0}
                                All done
                            {:else}
                                {todoStats.left}
                                {todoStats.left === 1 ? 'task' : 'tasks'} to do
                            {/if}
                        </span>
                    {/if}
                    {#if card.assignee}
                        <span
                            class="ml-2 avatar-sm"
                            class:ml-auto={todoStats.total == 0}
                        >
                            <Avatar
                                userId={card.assignee.id}
                                imageUrl={card.assignee.avatarUrlSmall}
                                name={card.assignee.fullName}
                            />
                        </span>
                    {:else}
                        <div
                            class="ml-2 h-[1.25rem] w-[1.25rem] rounded-full flex items-center justify-center bg-gray-80 dark:bg-gray-800 icon-xs"
                            class:ml-auto={todoStats.total == 0}
                        >
                            <UserIconSolid />
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
        {#if card.unreadMessages.length > 0}
            <div
                class="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-modified rounded-full pointer-events-none z-100"
                aria-label="{card.unreadMessages.length} unread messages"
            ></div>
        {/if}
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
