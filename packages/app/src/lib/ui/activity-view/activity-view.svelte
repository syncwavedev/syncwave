<script lang="ts">
    import type {BoardTreeView, MessageView} from '../../agent/view.svelte';
    import ActivityItemCreated from './activity-item-created.svelte';
    import ActivityItemMoved from './activity-item-moved.svelte';
    import ActivityItemDeleted from './activity-item-deleted.svelte';
    import ActivityItemAssigneeChanged from './activity-item-assignee-changed.svelte';
    import ActivityItemText from './activity-item-text.svelte';
    import CheckCheckIcon from '../components/icons/check-check-icon.svelte';
    import {getAgent} from '../../agent/agent.svelte';
    import {getNow} from 'syncwave';
    import {toastManager} from '../../../toast-manager.svelte';

    interface Props {
        board: BoardTreeView;
    }

    let {board}: Props = $props();

    const sortedMessages = $derived(
        board.messages.sort((a, b) => b.createdAt - a.createdAt)
    );

    const agent = getAgent();

    function readMessages() {
        agent.updateBoardCursorTimestamp(board.id, getNow());

        toastManager.info(
            'Messages read',
            'All messages have been marked as read.'
        );
    }
</script>

{#snippet messageList(messages: Array<MessageView>)}
    {#each messages as message (message.id)}
        {@const isNew = message.card.unreadMessages.length > 0}
        <div data-message-id={message.id}>
            {#if message.payload.type === 'card_column_changed'}
                <ActivityItemMoved {message} {isNew} />
            {:else if message.payload.type === 'card_created'}
                <ActivityItemCreated {message} {isNew} />
            {:else if message.payload.type === 'card_deleted'}
                <ActivityItemDeleted {message} {isNew} />
            {:else if message.payload.type === 'card_assignee_changed'}
                <ActivityItemAssigneeChanged {message} {isNew} />
            {:else if message.payload.type === 'text'}
                <ActivityItemText {message} {isNew} />
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
        <p>Inbox</p>
        <button class="btn--icon ml-auto text-ink-body" onclick={readMessages}>
            <CheckCheckIcon />
        </button>
    </div>
    <div
        class="overflow-y-auto no-scrollbar flex flex-col gap-2 flex-1 px-panel-inline-half py-3"
    >
        {@render messageList(sortedMessages)}
    </div>
</div>
