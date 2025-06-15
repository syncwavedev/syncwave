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
    import TimesIcon from '../components/icons/times-icon.svelte';

    interface Props {
        board: BoardTreeView;
    }

    let {board}: Props = $props();

    const agent = getAgent();

    function readMessages() {
        const now = getNow();
        board.messages.forEach(message => {
            if (!message.readByMeAt) {
                agent.markMessageAsRead(message.id, now);
            }
        });

        toastManager.info(
            'Messages read',
            'All messages have been marked as read.'
        );
    }
</script>

{#snippet messageList(messages: Array<MessageView>)}
    {#each messages as message (message.id)}
        {@const isNew = message.card.messages.some(x => !x.readByMeAt)}
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

<div class="border-divider border-l z-10 flex w-full flex-shrink-0 flex-col">
    <div
        class="
          flex
          items-center
          justify-between
          gap-4
          px-panel-inline
          h-panel-header
        "
    >
        <div class="flex flex-col gap-1">
            <p class="font-semibold">Inbox</p>
            <p class="text-ink-detail text-xs">
                {board.messages.length}
                {board.messages.length === 1
                    ? 'unread message'
                    : 'unread messages'}
            </p>
        </div>
        <div class="flex gap-2">
            <button class="btn btn--icon btn--bordered" onclick={readMessages}>
                <CheckCheckIcon />
            </button>
            <button class="btn btn--icon btn--bordered">
                <TimesIcon />
            </button>
        </div>
    </div>
    <div class="overflow-y-auto no-scrollbar flex flex-col flex-1">
        {@render messageList(board.messages)}
    </div>
</div>
