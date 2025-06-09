<script lang="ts">
    import type {MessageView} from '../../agent/view.svelte';
    import HashtagIcon from '../components/icons/hashtag-icon.svelte';
    import TimeAgo from '../components/time-ago.svelte';
    import type {Snippet} from 'svelte';

    interface Props {
        message: MessageView;
        icon: Snippet;
        action: Snippet;
        isNew: boolean;
    }

    let {message, icon, action, isNew}: Props = $props();
</script>

<div
    class="
    flex
    gap-2
    px-panel-inline-half
    mx-panel-inline-half
    py-2
    leading-relaxed
    hover:bg-material-1-hover
    rounded-md
    "
>
    <div class="symbol">
        <span>{@render icon()}</span>
    </div>
    <div class="avatar-xs flex flex-1 flex-col gap-1 truncate">
        <div class="flex items-center gap-1">
            <div class="flex items-center icon-base">
                <HashtagIcon />
                {message.card.counter}
            </div>
            <div>
                {@render action()}
            </div>
        </div>
        <div class="flex items-center">
            <span class="truncate">
                {message.card.plainText
                    .split('\n')
                    .map(x => x.trim())
                    .find(x => x.length > 0) ?? 'Untitled'}
            </span>
        </div>
        <div class="text-sm text-ink-detail mt-0.75">
            {message.author.fullName}
            <TimeAgo time={message.createdAt} />
        </div>
    </div>
    {#if isNew}
        <div class="h-1.5 w-1.5 bg-modified rounded-full"></div>
    {/if}
</div>

<style>
    .symbol {
        --icon-size: 1.4em;
    }
</style>
