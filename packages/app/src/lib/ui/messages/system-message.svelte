<script lang="ts">
    import type {MessageView} from '../../agent/view.svelte';
    import TimeAgo from '../components/time-ago.svelte';

    const {message}: {message: MessageView} = $props();
</script>

<div
    class="flex items-center justify-center gap-1.5 relative text-sm panel-padding-inline py-2"
>
    {#if message.payload.type === 'card_created'}
        <span>
            <span class="font-medium">{message.author.fullName}</span>
            created the card
            <TimeAgo time={message.payload.cardCreatedAt} />
        </span>
    {/if}

    {#if message.payload.type === 'card_deleted'}
        <span>
            <span class="font-medium">{message.author.fullName}</span>
            deleted the card
            <TimeAgo time={message.payload.cardDeletedAt} />
        </span>
    {/if}

    {#if message.payload.type === 'card_column_changed'}
        <span>
            <span class="font-medium">{message.author.fullName}</span>
            moved the card from
            <span class="font-medium">{message.payload.fromColumnName}</span>
            to
            <span class="font-medium">{message.payload.toColumnName}</span>
            <TimeAgo time={message.payload.cardColumnChangedAt} />
        </span>
    {/if}
</div>
