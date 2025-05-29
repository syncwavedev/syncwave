<script lang="ts">
    import type {MessageView} from '../../agent/view.svelte';
    import Avatar from '../components/avatar.svelte';
    import TimeAgo from '../components/time-ago.svelte';

    let {message}: {message: MessageView} = $props();
</script>

{#if message.payload.type === 'card_column_changed'}
    <div
        class="avatar-xs text-ink-body px-[calc(var(--panel-padding-inline)/2)] py-1.5 leading-relaxed hover:bg-gray-1050 rounded-md"
    >
        <Avatar
            name={message.author.fullName}
            userId={message.author.id}
            imageUrl={message.author.avatarUrlSmall}
        />
        <span class="text-ink font-medium">{message.author.fullName}</span>
        <span>moved task #{message.card.counter}:</span>
        <span class="text-ink">
            "{message.card.plainText.slice(0, 50)}"
        </span>
        <span>from</span>
        <span class="text-ink">
            "{message.payload.fromColumnName}"
        </span>
        <span>to</span>
        <span class="text-ink">
            "{message.payload.toColumnName}"
        </span>
        <span><TimeAgo time={message.createdAt} /></span>
    </div>
{/if}
