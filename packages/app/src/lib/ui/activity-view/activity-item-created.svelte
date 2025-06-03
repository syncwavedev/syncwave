<script lang="ts">
    import type {MessageView} from '../../agent/view.svelte';
    import Avatar from '../components/avatar.svelte';
    import TimeAgo from '../components/time-ago.svelte';

    let {message}: {message: MessageView} = $props();
</script>

<div
    class="avatar-xs text-ink-body px-[calc(var(--panel-padding-inline)/2)] py-2 leading-relaxed hover:bg-material-1-hover rounded-md"
>
    <Avatar
        name={message.author.fullName}
        userId={message.author.id}
        imageUrl={message.author.avatarUrlSmall}
    />
    <span class="text-ink font-medium">
        {message.author.fullName}
    </span>
    <span>created task #{message.card.counter}:</span>
    <span class="text-ink">
        "{message.card.plainText
            .split('\n')
            .map(x => x.trim())
            .slice(0, 64)
            .find(x => x.length > 0) ?? 'Untitled'}"
    </span>
    <span><TimeAgo time={message.createdAt} /></span>
</div>
