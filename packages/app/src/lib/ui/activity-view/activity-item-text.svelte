<script lang="ts">
    import type {MessageView} from '../../agent/view.svelte';
    import MessageSquareTextIcon from '../components/icons/message-square-text-icon.svelte';
    import ActivityItem from './activity-item.svelte';

    let {message, isNew}: {message: MessageView; isNew: boolean} = $props();
</script>

<ActivityItem {message} {isNew}>
    {#snippet icon()}
        <MessageSquareTextIcon />
    {/snippet}
    {#snippet action()}
        <span>has new message</span>
    {/snippet}
</ActivityItem>
