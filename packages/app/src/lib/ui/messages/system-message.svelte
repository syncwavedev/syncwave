<script lang="ts">
    import type {MessageView} from '../../agent/view.svelte';
    import Avatar from '../components/avatar.svelte';
    import TimeAgo from '../components/time-ago.svelte';

    const {message}: {message: MessageView} = $props();
</script>

<div
    class="flex items-center gap-1.5 relative text-sm mx-panel-inline px-panel-inline-half py-2 leading-relaxed text-ink-detail"
>
    {#if message.payload.type === 'card_created'}
        <span class="avatar-container">
            <Avatar
                userId={message.author.id}
                name={message.author.fullName}
                imageUrl={message.author.avatarUrlSmall}
                class="avatar--small"
            />
        </span>
        <span>
            <span class="font-semibold">{message.author.fullName}</span>
            created the card
            <TimeAgo time={message.payload.cardCreatedAt} />
        </span>
    {/if}

    {#if message.payload.type === 'card_deleted'}
        <span class="avatar-container">
            <Avatar
                userId={message.author.id}
                name={message.author.fullName}
                imageUrl={message.author.avatarUrlSmall}
                class="avatar--small"
            />
        </span>
        <span>
            <span class="font-semibold">{message.author.fullName}</span>
            deleted the card
            <TimeAgo time={message.payload.cardDeletedAt} />
        </span>
    {/if}

    {#if message.payload.type === 'card_column_changed'}
        <span class="avatar-container">
            <Avatar
                userId={message.author.id}
                name={message.author.fullName}
                imageUrl={message.author.avatarUrlSmall}
                class="avatar--small"
            />
        </span>
        <span>
            <span class="font-semibold">{message.author.fullName}</span>
            moved the card from
            <span class="font-semibold">{message.payload.fromColumnName}</span>
            to
            <span class="font-semibold">{message.payload.toColumnName}</span>
            <TimeAgo time={message.payload.cardColumnChangedAt} />
        </span>
    {/if}

    {#if message.payload.type === 'card_assignee_changed'}
        <span class="avatar-container">
            <Avatar
                userId={message.author.id}
                name={message.author.fullName}
                imageUrl={message.author.avatarUrlSmall}
                class="avatar--small"
            />
        </span>
        <span>
            <span class="font-semibold">{message.author.fullName}</span>
            changed the card assignee from
            <span class="font-semibold"
                >{message.payload.fromAssignee?.fullName ?? 'Unassigned'}</span
            >
            to
            <span class="font-semibold"
                >{message.payload.toAssignee?.fullName ?? 'Unassigned'}</span
            >
            <TimeAgo time={message.payload.cardAssigneeChangedAt} />
        </span>
    {/if}
</div>

<style>
    .avatar-container {
        display: grid;
        place-items: center;

        aspect-ratio: 1 / 1;

        width: calc(2.2 * 0.7 * 14px);
        height: calc(2.2 * 0.7 * 14px);
    }
</style>
