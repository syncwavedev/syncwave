<script lang="ts">
    import {getAgent} from '../../agent/agent.svelte';
    import type {BoardTreeView, MessageView} from '../../agent/view.svelte';
    import ActivityItemCreated from './activity-item-created.svelte';
    import ActivityItemMoved from './activity-item-moved.svelte';

    interface Props {
        board: BoardTreeView;
    }

    let {board}: Props = $props();

    const agent = getAgent();

    let scrollContainer: HTMLDivElement;

    const readMessages = $derived(
        board.unreadMessages.filter(
            x => x.createdAt < board.lastReadMessageTimestamp
        )
    );

    const unreadMessages = $derived(
        board.unreadMessages.filter(
            x => x.createdAt >= board.lastReadMessageTimestamp
        )
    );

    function handleScroll() {
        if (!scrollContainer) return;

        const messageElements =
            scrollContainer.querySelectorAll('[data-message-id]');
        let latestVisibleMessage: MessageView | null = null;

        messageElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();

            // Check if message is visible within the scroll container
            if (
                rect.top >= containerRect.top &&
                rect.top <= containerRect.bottom
            ) {
                const messageId = element.getAttribute('data-message-id');
                const allMessages = [...readMessages, ...unreadMessages];
                const message = allMessages.find(m => m.id === messageId);

                if (
                    message &&
                    (!latestVisibleMessage ||
                        message.createdAt > latestVisibleMessage.createdAt)
                ) {
                    latestVisibleMessage = message;
                }
            }
        });

        if (latestVisibleMessage) {
            agent.updateBoardCursosTimestamp(
                board.id,
                latestVisibleMessage.createdAt
            );
        }
    }
</script>

{#snippet messageList(messages: Array<MessageView>)}
    {#each messages as message (message.id)}
        <div data-message-id={message.id}>
            {#if message.payload.type === 'card_column_changed'}
                <ActivityItemMoved {message} />
            {/if}
            {#if message.payload.type === 'card_created'}
                <ActivityItemCreated {message} />
            {/if}
        </div>
    {/each}
{/snippet}

<div
    class="border-divider border-r z-10 flex w-full flex-shrink-0 flex-col bg-sidebar"
>
    <div class="flex items-center px-panel-inline h-panel-header">
        <p class="font-medium">Activity</p>
    </div>
    <div
        bind:this={scrollContainer}
        onscroll={handleScroll}
        class="overflow-y-auto no-scrollbar flex flex-col gap-1 flex-1 px-panel-inline-half"
    >
        {@render messageList(readMessages)}
        <div class="flex items-center">
            <div class="h-[1px] bg-divider flex-1"></div>
            <div
                class="text-center my-2 text-ink-body text-xs bg-material-1 px-1 py-0.5 rounded-sm"
            >
                New for you
            </div>
            <div class="h-[1px] bg-divider flex-1"></div>
        </div>
        {@render messageList(unreadMessages)}
    </div>
</div>
