<script lang="ts">
    import type {MessageView} from '../../agent/view.svelte';
    import Avatar from '../components/avatar.svelte';
    import TimeAgo from '../components/time-ago.svelte';

    let {message}: {message: MessageView} = $props();
</script>

{#if message.payload.type === 'card_column_changed'}
    <div
        class="avatar-xs text-ink-body px-panel-inline-half py-1 leading-relaxed hover:bg-material-1-hover rounded-md flex flex-col gap-0.5"
    >
        <div>
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
        </div>
        <div><TimeAgo time={message.createdAt} /></div>
    </div>
{/if}
