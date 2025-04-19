<script lang="ts">
    import RichtextView from '../../components/richtext-view.svelte';
    import type {MessageView} from '../../agent/view.svelte';
    import Avatar from '../components/avatar.svelte';

    interface Props {
        messages: MessageView[];
    }

    const {messages}: Props = $props();
</script>

<div class="flex flex-col gap-4 flex-1 relative">
    {#each messages as message, index (message.id)}
        <div class="flex flex-col panel-padding-inline relative">
            <div class="flex items-center gap-1.5 relative">
                <Avatar name={message.author.fullName} />

                <div class="flex items-baseline gap-1.5">
                    <div class="font-semibold text-sm leading-none">
                        {message.author.fullName}
                    </div>

                    <span class="text-ink-detail text-xs">
                        {new Date(message.createdAt)
                            .toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                            })
                            .toLowerCase()}
                    </span>
                </div>
            </div>
            <div
                class="select-text leading-relaxed ml-[calc(var(--avatar-size)+0.375rem))] relative"
            >
                <!-- Vertical line extending below avatar -->
                {#if index < messages.length - 1}
                    <div
                        class="absolute left-[calc((var(--avatar-size)/2)-0.5px)] w-[1px] h-[calc(100%+1rem)] bg-divider-subtle -ml-[calc(var(--avatar-size)+0.375rem)]"
                    ></div>
                {/if}
                {#if message.payload.type === 'text'}
                    <RichtextView fragment={message.payload.text.__fragment!} />
                {:else if message.payload.type === 'card_created'}
                    Created card on {new Date(
                        message.payload.cardCreatedAt
                    ).toLocaleDateString()}
                {/if}
            </div>
        </div>
    {/each}
</div>
