<script lang="ts">
    import type {BoardTreeView, MessageView} from '../../agent/view.svelte';
    import ActivityItemCreated from './activity-item-created.svelte';
    import ActivityItemMoved from './activity-item-moved.svelte';
    import ActivityItemDeleted from './activity-item-deleted.svelte';
    import ActivityItemAssigneeChanged from './activity-item-assignee-changed.svelte';
    import ActivityItemText from './activity-item-text.svelte';

    interface Props {
        board: BoardTreeView;
    }

    let {board}: Props = $props();

    const sortedMessages = $derived(
        board.messages.sort((a, b) => b.createdAt - a.createdAt)
    );

    const readMessages = $derived(
        sortedMessages.filter(x => x.createdAt < board.lastReadMessageTimestamp)
    );

    const unreadMessages = $derived(
        sortedMessages.filter(
            x => x.createdAt >= board.lastReadMessageTimestamp
        )
    );
</script>

{#snippet messageList(messages: Array<MessageView>)}
    {#each messages as message (message.id)}
        <div data-message-id={message.id}>
            {#if message.payload.type === 'card_column_changed'}
                <ActivityItemMoved {message} />
            {:else if message.payload.type === 'card_created'}
                <ActivityItemCreated {message} />
            {:else if message.payload.type === 'card_deleted'}
                <ActivityItemDeleted {message} />
            {:else if message.payload.type === 'card_assignee_changed'}
                <ActivityItemAssigneeChanged {message} />
            {:else if message.payload.type === 'text'}
                <ActivityItemText {message} />
            {/if}
        </div>
    {/each}
{/snippet}

<div
    class="border-divider border-r z-10 flex w-full flex-shrink-0 flex-col bg-sidebar"
>
    <div
        class="flex items-center px-panel-inline h-panel-header border-b border-divider"
    >
        <p>Activity</p>
    </div>
    <div
        class="overflow-y-auto no-scrollbar flex flex-col gap-2 flex-1 px-panel-inline-half py-3"
    >
        {@render messageList(unreadMessages)}
        {#if readMessages.length > 0}
            <div class="flex items-center">
                <div class="h-[1px] bg-divider flex-1"></div>
                <div
                    class="text-center my-2 text-ink-body text-xs bg-material-1 px-1 py-0.5 rounded-sm"
                >
                    New for you
                </div>
                <div class="h-[1px] bg-divider flex-1"></div>
            </div>
            {@render messageList(readMessages)}
        {/if}
    </div>
</div>
