<script lang="ts">
    import type {
        CardColumnChangedMessagePayloadView,
        MessageView,
    } from '../../agent/view.svelte';
    import ActivityItem from './activity-item.svelte';
    import ArrowRightSquareIcon from '../components/icons/arrow-right-square-icon.svelte';

    let {message, isNew}: {message: MessageView; isNew: boolean} = $props();
    let payload = $derived(
        message.payload as CardColumnChangedMessagePayloadView
    );
</script>

<ActivityItem {message} {isNew}>
    {#snippet icon()}
        <span class="text-modified">
            <ArrowRightSquareIcon />
        </span>
    {/snippet}
    {#snippet action()}
        <span>moved to</span>
        <span>{payload.toColumnName}</span>
    {/snippet}
</ActivityItem>
