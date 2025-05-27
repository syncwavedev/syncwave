<script lang="ts">
    import type {CardId} from 'syncwave';
    import type {BoardTreeView} from '../../agent/view.svelte';
    import Avatar from '../components/avatar.svelte';
    import {meta} from 'eslint-plugin-svelte/lib/processor';
    import TimeAgo from '../components/time-ago.svelte';

    interface Props {
        board: BoardTreeView;
    }

    let {board}: Props = $props();

    const findCard = (cardId: CardId) =>
        board.columns
            .flatMap(column => column.cards)
            .find(card => card.id === cardId);
</script>

<div class="border-divider border-r z-10 flex w-full flex-shrink-0 flex-col">
    <div class="panel-header font-medium">Activity</div>
    <!-- Scrollable Content Section -->
    <div class="overflow-y-auto no-scrollbar flex flex-col flex-1 py-2">
        {#each board.unreadMessages as message (message.id)}
            {#if message.payload.type === 'card_column_changed'}
                {@const card = findCard(message.payload.cardId)}
                <div
                    class="avatar-xs text-ink-body panel-padding-inline py-2 leading-relaxed hover:bg-material-base-hover"
                >
                    <Avatar
                        name={message.author.fullName}
                        userId={message.author.id}
                        imageUrl={message.author.avatarUrlSmall}
                    />
                    <span class="text-ink">{message.author.fullName}</span>
                    <span>moved task #{card?.counter}:</span>
                    <span class="text-ink">
                        "{card?.plainText.slice(0, 50)}"
                    </span>
                    <span>from</span>
                    <span class="text-ink">
                        "{message.payload.fromColumnName}"
                    </span>
                    <span>to</span>
                    <span class="text-ink">
                        "{message.payload.toColumnName}"
                    </span>
                    <span><TimeAgo time={message.createdAt} /></span>
                </div>
            {/if}
            {#if message.payload.type === 'card_created'}
                {@const card = findCard(message.payload.cardId)}
                <div
                    class="avatar-xs text-ink-body panel-padding-inline py-2 leading-relaxed hover:bg-material-base-hover"
                >
                    <Avatar
                        name={message.author.fullName}
                        userId={message.author.id}
                        imageUrl={message.author.avatarUrlSmall}
                    />
                    <span class="text-ink">{message.author.fullName}</span>
                    <span>created task #{card?.counter}:</span>
                    <span class="text-ink">
                        "{card?.plainText.slice(0, 50)}"
                    </span>
                    <span><TimeAgo time={message.createdAt} /></span>
                </div>
            {/if}
        {/each}

        <!-- <div class="flex items-center">
            <div class="h-[1px] bg-divider flex-1"></div>
            <div
                class="text-center my-2 text-ink-body text-xs bg-material-1 px-1 py-0.5 rounded-sm"
            >
                New activities
            </div>
            <div class="h-[1px] bg-divider flex-1"></div>
        </div> -->
    </div>
</div>
