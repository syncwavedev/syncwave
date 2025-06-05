<script lang="ts">
    import type {MessageView} from '../../agent/view.svelte';
    import ActivityItem from './activity-item.svelte';
    import MinusCircleSolidIcon from '../components/icons/minus-circle-solid-icon.svelte';

    let {message}: {message: MessageView} = $props();
</script>

<ActivityItem {message}>
    {#snippet icon()}
        <span>
            <MinusCircleSolidIcon />
        </span>
    {/snippet}
    {#snippet action()}
        <span class="font-medium italic">Card deleted</span>
    {/snippet}
</ActivityItem>
