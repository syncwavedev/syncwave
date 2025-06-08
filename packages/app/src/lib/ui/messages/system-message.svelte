<script lang="ts">
    import type {MessageView} from '../../agent/view.svelte';
    import TimeAgo from '../components/time-ago.svelte';

    const {message}: {message: MessageView} = $props();
</script>

<div
    class="flex items-center justify-center gap-1.5 relative text-sm px-panel-inline py-2 text-center max-w-xs mx-auto leading-relaxed"
>
    {#if message.payload.type === 'card_created'}
        <span>
            <span class="font-semibold">{message.author.fullName}</span>
            created the card
            <TimeAgo time={message.payload.cardCreatedAt} />
        </span>
    {/if}

    {#if message.payload.type === 'card_deleted'}
        <span>
            <span class="font-semibold">{message.author.fullName}</span>
            deleted the card
            <TimeAgo time={message.payload.cardDeletedAt} />
        </span>
    {/if}

    {#if message.payload.type === 'card_column_changed'}
        <span>
            <span class="font-semibold">{message.author.fullName}</span>
            moved the card from
            <span class="font-semibold">{message.payload.fromColumnName}</span>
            to
            <span class="font-semibold">{message.payload.toColumnName}</span>
            <TimeAgo time={message.payload.cardColumnChangedAt} />
        </span>
    {/if}

    {#if message.payload.type === 'card_assignee_changed'}
        <span>
            <span class="font-semibold">{message.author.fullName}</span>
            changed the card assignee from
            <span class="font-semibold"
                >{message.payload.fromAssignee?.fullName ?? 'Unassigned'}</span
            >
            to
            <span class="font-semibold"
                >{message.payload.toAssignee?.fullName ?? 'Unassigned'}</span
            >
            <TimeAgo time={message.payload.cardAssigneeChangedAt} />
        </span>
    {/if}
</div>
