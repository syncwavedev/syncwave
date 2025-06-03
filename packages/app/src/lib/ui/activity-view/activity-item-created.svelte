<script lang="ts">
    import type {MessageView} from '../../agent/view.svelte';
    import Avatar from '../components/avatar.svelte';
    import TimeAgo from '../components/time-ago.svelte';

    let {message}: {message: MessageView} = $props();
</script>

<div
    class="avatar-xs text-ink-body px-panel-inline-half py-1 leading-relaxed hover:bg-material-1-hover rounded-md flex flex-col gap-0.5"
>
    <div>
        <Avatar
            name={message.author.fullName}
            userId={message.author.id}
            imageUrl={message.author.avatarUrlSmall}
        />
        <span class="text-ink font-medium">
            {message.author.fullName}
        </span>
        <span class="text-ink">created task #{message.card.counter}:</span>
        <span class="text-ink">
            "{message.card.plainText
                .split('\n')
                .map(x => x.trim())
                .slice(0, 64)
                .find(x => x.length > 0) ?? 'Untitled'}"
        </span>
    </div>
    <div><TimeAgo time={message.createdAt} /></div>
</div>
