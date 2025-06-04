<script lang="ts">
    import type {MessageView} from '../../agent/view.svelte';
    import MessageSquareTextIcon from '../components/icons/message-square-text-icon.svelte';
    import ActivityItem from './activity-item.svelte';

    let {message}: {message: MessageView} = $props();
</script>

<ActivityItem {message}>
    {#snippet icon()}
        <span class="text-[#89d0f1]">
            <MessageSquareTextIcon />
        </span>
    {/snippet}
    {#snippet action()}
        <span class="font-medium italic">New comment</span>
    {/snippet}
</ActivityItem>
