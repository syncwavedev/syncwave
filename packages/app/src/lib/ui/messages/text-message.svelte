<script lang="ts">
    import type {
        MessageView,
        TextMessagePayloadView,
    } from '../../agent/view.svelte';
    import Avatar from '../components/avatar.svelte';
    import RichtextView from '../components/richtext-view.svelte';
    import TimeAgo from '../components/time-ago.svelte';

    const {message}: {message: MessageView} = $props();
</script>

<div
    class="flex flex-col panel-padding-inline py-2 relative hover:bg-material-base-hover"
>
    <div class="flex items-center gap-1.5 relative avatar-sm">
        <Avatar userId={message.author.id} name={message.author.fullName} />

        <div class="flex items-baseline gap-1.5">
            <div class="font-medium text-md">
                {message.author.fullName}
            </div>

            <span class="text-ink-detail text-sm">
                <TimeAgo time={message.createdAt} />
            </span>
        </div>
    </div>
    <div
        class="select-text leading-relaxed ml-[calc(var(--avatar-size)+0.375rem))] relative avatar-sm mt-0.5"
    >
        <RichtextView
            fragment={(message.payload as TextMessagePayloadView).text
                .__fragment!}
        />
    </div>
</div>
