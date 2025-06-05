<script lang="ts">
    import type {MessageView} from '../../agent/view.svelte';
    import ActivityItem from './activity-item.svelte';
    import PlusSquareIcon from '../components/icons/plus-square-icon.svelte';

    let {message, isNew}: {message: MessageView; isNew: boolean} = $props();
</script>

<ActivityItem {message} {isNew}>
    {#snippet icon()}
        <PlusSquareIcon />
    {/snippet}
    {#snippet action()}
        <span class="italic font-medium">Card created</span>
    {/snippet}
</ActivityItem>
