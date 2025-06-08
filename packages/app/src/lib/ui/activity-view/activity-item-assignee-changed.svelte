<script lang="ts">
    import type {
        CardAssigneeChangedMessagePayloadView,
        MessageView,
    } from '../../agent/view.svelte';
    import ActivityItem from './activity-item.svelte';
    import Avatar from '../components/avatar.svelte';
    import UsersIcon from '../components/icons/users-icon.svelte';

    let {message, isNew}: {message: MessageView; isNew: boolean} = $props();
    let payload = $derived(
        message.payload as CardAssigneeChangedMessagePayloadView
    );
</script>

<ActivityItem {message} {isNew}>
    {#snippet icon()}
        <span>
            <UsersIcon />
        </span>
    {/snippet}
    {#snippet action()}
        {#if payload.toAssignee}
            <span class="mr-1">assigned to</span>
            <Avatar
                name={payload.toAssignee.fullName}
                userId={payload.toAssignee.id}
                imageUrl={payload.toAssignee.avatarUrlSmall}
            />
            <span class="ml-0.25">{payload.toAssignee.fullName}</span>
        {:else}
            <span>unassigned</span>
        {/if}
    {/snippet}
</ActivityItem>
