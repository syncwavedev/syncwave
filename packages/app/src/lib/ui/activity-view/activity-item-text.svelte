<script lang="ts">
    import type {MessageView} from '../../agent/view.svelte';
    import MessageSquareTextIcon from '../components/icons/message-square-text-icon.svelte';
    import ActivityItem from './activity-item.svelte';

    let {message}: {message: MessageView} = $props();
</script>

<ActivityItem {message}>
    {#snippet icon()}
        <MessageSquareTextIcon />
    {/snippet}
    {#snippet action()}
        <span class="font-medium italic">New message</span>
    {/snippet}
</ActivityItem>
