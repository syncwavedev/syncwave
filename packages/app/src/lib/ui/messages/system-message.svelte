<script lang="ts">
    import type {MessageView} from '../../agent/view.svelte';
    import Avatar from '../components/avatar.svelte';
    import TimeAgo from '../components/time-ago.svelte';

    const {message}: {message: MessageView} = $props();
</script>

<div
    class="
    flex
    flex-col
    py-1.5
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
    </div>
    <div
        class="select-text leading-relaxed ml-[calc(var(--avatar-size)*0.8+0.3rem))] relative text-xl"
    >
        {#if message.payload.type === 'card_created'}
            <p class="text-ink-detail">Created this card</p>
        {/if}

        {#if message.payload.type === 'card_deleted'}
            <p class="text-ink-detail">Deleted the card</p>
        {/if}

        {#if message.payload.type === 'card_column_changed'}
            <p class="text-ink-detail">
                Moved the card from
                <span class="">{message.payload.fromColumnName}</span>
                to
                <span class="">{message.payload.toColumnName}</span>
            </p>
        {/if}

        {#if message.payload.type === 'card_assignee_changed'}
            <p class="text-ink-detail">
                Changed the card assignee from
                <span class=""
                    >{message.payload.fromAssignee?.fullName ??
                        'Unassigned'}</span
                >
                to
                <span class=""
                    >{message.payload.toAssignee?.fullName ??
                        'Unassigned'}</span
                >
            </p>
        {/if}
    </div>
</div>
