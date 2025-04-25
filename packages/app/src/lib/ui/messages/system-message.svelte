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
            created card
            <TimeAgo time={message.payload.cardCreatedAt} />
        </span>
    {/if}
</div>
