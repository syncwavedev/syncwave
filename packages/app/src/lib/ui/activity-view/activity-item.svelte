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
    px-panel-inline
    py-3
    leading-relaxed
    hover:bg-material-1-hover
    border-b
    border-divider
    "
>
    <div class="icon-lg text-ink-body mt-0.25">
        <span>{@render icon()}</span>
    </div>
    <div class="avatar-xs flex flex-1 flex-col gap-1 truncate">
        <div class="flex items-center gap-1" class:font-semibold={isNew}>
            <div class="flex items-center icon-base">
                <HashtagIcon strokeWidth={isNew ? '2.5' : '1.5'} />

                {message.card.counter}
            </div>
            <div>
                {@render action()}
            </div>
        </div>
        <div class="flex items-center">
            <span class="truncate text-ink-body">
                {message.card.plainText
                    .split('\n')
                    .map(x => x.trim())
                    .find(x => x.length > 0) ?? 'Untitled'}
            </span>
        </div>
        <div class="mt-1 text-xs">
            <span class="text-ink-detail">
                {message.author.fullName}
            </span>
            <span class="text-ink-detail">
                <TimeAgo time={message.createdAt} />
            </span>
        </div>
    </div>
    {#if isNew}
        <div class="h-1.5 w-1.5 bg-modified rounded-full"></div>
    {/if}
</div>
