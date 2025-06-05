<script lang="ts">
    import type {MessageView} from '../../agent/view.svelte';
    import Avatar from '../components/avatar.svelte';
    import HashtagIcon from '../components/icons/hashtag-icon.svelte';
    import TimeAgo from '../components/time-ago.svelte';
    import type {Snippet} from 'svelte';

    interface Props {
        message: MessageView;
        icon: Snippet;
        action: Snippet;
    }

    let {message, icon, action}: Props = $props();
</script>

<div
    class="avatar-xs px-panel-inline-half py-1 leading-relaxed hover:bg-material-1-hover rounded-md flex flex-col gap-1"
>
    <div>
        <span>{@render icon()}</span>
        {@render action()}
    </div>
    <div class="flex items-center">
        <span class="flex items-center icon-base mr-1">
            <HashtagIcon />
            {message.card.counter}
        </span>
        <span class="truncate">
            {message.card.plainText
                .split('\n')
                .map(x => x.trim())
                .find(x => x.length > 0) ?? 'Untitled'}
        </span>
    </div>
    <div>
        <Avatar
            name={message.author.fullName}
            userId={message.author.id}
            imageUrl={message.author.avatarUrlSmall}
        />
        <span class="font-medium ml-0.25">
            {message.author.fullName}
        </span>
        <span class="text-ink-detail text-xs ml-1">
            <TimeAgo time={message.createdAt} />
        </span>
    </div>
</div>
