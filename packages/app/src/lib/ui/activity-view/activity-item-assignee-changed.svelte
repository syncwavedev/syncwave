<script lang="ts">
    import type {
        CardAssigneeChangedMessagePayloadView,
        MessageView,
    } from '../../agent/view.svelte';
    import ActivityItem from './activity-item.svelte';
    import Avatar from '../components/avatar.svelte';
    import UserCircleSolidIcon from '../components/icons/user-circle-solid-icon.svelte';

    let {message}: {message: MessageView} = $props();
    let payload = $derived(
        message.payload as CardAssigneeChangedMessagePayloadView
    );
</script>

<ActivityItem {message}>
    {#snippet icon()}
        <span>
            <UserCircleSolidIcon />
        </span>
    {/snippet}
    {#snippet action()}
        {#if payload.toAssignee}
            <span class="font-medium italic mr-1">Card assigned to</span>
            <Avatar
                name={payload.toAssignee.fullName}
                userId={payload.toAssignee.id}
                imageUrl={payload.toAssignee.avatarUrlSmall}
            />
            <span class="font-medium ml-0.25"
                >{payload.toAssignee.fullName}</span
            >
        {:else}
            <span class="font-medium italic">Card unassigned</span>
        {/if}
    {/snippet}
</ActivityItem>
