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
    class="flex flex-col panel-padding-inline py-2 relative group avatar-sm icon-sm"
>
    <div class="flex items-center gap-1.5 relative">
        <Avatar
            userId={message.author.id}
            name={message.author.fullName}
            imageUrl={message.author.avatarUrl}
        />

        <div class="flex items-baseline gap-1.5">
            <div class="font-medium text-md">
                {message.author.fullName}
            </div>

            <span class="text-ink-detail text-sm">
                <TimeAgo time={message.createdAt} />
            </span>
        </div>

        <button
            class="ml-auto btn--icon btn--icon--sm invisible group-hover:visible"
            onclick={onDeleteMessage}
        >
            <TrashIcon />
        </button>
    </div>
    <div
        class="select-text leading-relaxed ml-[calc(var(--avatar-size)+0.375rem))] relative"
    >
        <RichtextView
            fragment={(message.payload as TextMessagePayloadView).text
                .__fragment!}
        />
    </div>
</div>
