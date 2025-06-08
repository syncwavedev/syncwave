<script lang="ts">
    import type {MessageView} from '../../agent/view.svelte';
    import ActivityItem from './activity-item.svelte';
    import MinusCircleSolidIcon from '../components/icons/minus-circle-solid-icon.svelte';

    let {message, isNew}: {message: MessageView; isNew: boolean} = $props();
</script>

<ActivityItem {message} {isNew}>
    {#snippet icon()}
        <span>
            <MinusCircleSolidIcon />
        </span>
    {/snippet}
    {#snippet action()}
        <span>deleted</span>
    {/snippet}
</ActivityItem>
