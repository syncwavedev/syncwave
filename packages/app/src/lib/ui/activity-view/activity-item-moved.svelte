<script lang="ts">
    import type {
        CardColumnChangedMessagePayloadView,
        MessageView,
    } from '../../agent/view.svelte';
    import ActivityItem from './activity-item.svelte';
    import ArrowRightSquareIcon from '../components/icons/arrow-right-square-icon.svelte';

    let {message}: {message: MessageView} = $props();
    let payload = $derived(
        message.payload as CardColumnChangedMessagePayloadView
    );
</script>

<ActivityItem {message}>
    {#snippet icon()}
        <span class="text-[#dec184]">
            <ArrowRightSquareIcon />
        </span>
    {/snippet}
    {#snippet action()}
        <span class="font-medium italic">Card moved in</span>
        <span>{payload.toColumnName}</span>
    {/snippet}
</ActivityItem>
