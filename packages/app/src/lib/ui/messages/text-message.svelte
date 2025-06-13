<script lang="ts">
    import {getAgent} from '../../agent/agent.svelte';
    import type {
        MessageView,
        TextMessagePayloadView,
    } from '../../agent/view.svelte';
    import Avatar from '../components/avatar.svelte';
    import TrashIcon from '../components/icons/trash-icon.svelte';
    import RichtextView from '../components/richtext-view.svelte';
    import TimeAgo from '../components/time-ago.svelte';

    const {message}: {message: MessageView} = $props();

    const agent = getAgent();

    function onDeleteMessage() {
        const confirmMessage = `Are you sure you want to delete message? This action cannot be undone.`;
        if (confirm(confirmMessage)) {
            agent.deleteMessage(message.id);
        }
    }
</script>

<div
    class="
    flex
    flex-col
    px-panel-inline-half
    mx-panel-inline-half
    py-2
    relative
    group
    icon-sm
    hover:bg-material-base-hover
    rounded-md
    "
>
    <div class="flex items-center gap-1.5">
        <Avatar
            userId={message.author.id}
            name={message.author.fullName}
            imageUrl={message.author.avatarUrlSmall}
            class="avatar--small"
        />

        <div class="flex items-baseline gap-1.5">
            <div class="font-semibold text-md">
                {message.author.fullName}
            </div>

            <span class="text-ink-detail text-sm">
                <TimeAgo time={message.createdAt} />
            </span>
        </div>

        <button
            class="
            z-20
            absolute
            right-2
            top-0
            -translate-y-1/2
            bg-material-base!
            btn
            btn--icon
            btn--bordered
            btn--small
            invisible
            group-hover:visible"
            onclick={onDeleteMessage}
        >
            <TrashIcon />
        </button>
    </div>
    <div
        class="select-text leading-relaxed ml-[calc(var(--avatar-size)*0.7+0.375rem))] relative"
    >
        <RichtextView
            fragment={(message.payload as TextMessagePayloadView).text
                .__fragment!}
        />
    </div>
</div>
