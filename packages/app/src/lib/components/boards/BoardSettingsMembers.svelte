<script lang="ts">
    import {toastManager} from '../../managers/toast-manager.svelte';
    import {getAgent} from '../../agent/agent.svelte';
    import type {BoardView, MemberView, MeView} from '../../agent/view.svelte';
    import {appConfig} from '../../../config';
    import Avatar from '../Avatar.svelte';
    import ChevronDownIcon from '../icons/ChevronDownIcon.svelte';
    import ClipboardCopyIcon from '../icons/ClipboardCopyIcon.svelte';
    import PlusIcon from '../icons/PlusIcon.svelte';
    import RefreshIcon from '../icons/RefreshIcon.svelte';
    import Dropdown from '../Dropdown.svelte';
    import CheckIcon from '../icons/CheckIcon.svelte';
    import permissionManager from '../../managers/permission-manager';
    import {log, type MemberId, type MemberRole} from 'syncwave';

    let {board, me}: {board: BoardView; me: MeView} = $props();

    const agent = getAgent();

    const joinLink = $derived(`${appConfig.uiUrl}/join/${board.joinCode}`);

    let isUpdating = $state(false);
    let inviteEmail = $state('');

    async function onRefreshClick() {
        isUpdating = true;
        await agent.updateJoinCode(board.id).finally(() => {
            isUpdating = false;
        });
    }

    async function onCopyClick() {
        await navigator.clipboard.writeText(joinLink);

        toastManager.info(
            'Link copied',
            'The join link has been copied to your clipboard.'
        );
    }

    function displayRole(role: MemberRole) {
        switch (role) {
            case 'owner':
                return 'Owner';
            case 'admin':
                return 'Admin';
            case 'writer':
                return 'Member';
            case 'reader':
                return 'Guest';
            default:
                return 'Unknown';
        }
    }

    function canManage(member: MemberView): boolean {
        if (permissionManager.hasRole('owner')) {
            return true;
        }
        if (permissionManager.hasRole('admin')) {
            return member.role !== 'owner' && member.role !== 'admin';
        }
        return false;
    }

    function canRemove(member: MemberView): boolean {
        return (
            canManage(member) && member.id !== me.id && member.role !== 'owner'
        );
    }

    function canSetTo(role: MemberRole): boolean {
        if (role === 'owner') {
            return permissionManager.hasRole('owner');
        }
        return true;
    }

    function changeRole(member: MemberView, role: MemberRole) {
        if (member.role === role) return;

        if (role === 'owner') {
            const confirmed = confirm(
                'Are you sure you want to make this member an owner?'
            );
            if (!confirmed) return;
        }

        try {
            agent.updateMemberRole(member.id as MemberId, role);
        } catch (e) {
            toastManager.error(
                'Failed to change member role',
                'Please try again later.'
            );
            log.error({msg: 'Failed to change member role', error: e});
        }
    }

    function onRemoveClick(member: MemberView) {
        if (!confirm('Are you sure you want to remove this member?')) return;

        try {
            agent.deleteMember(member.id as MemberId);
        } catch (e) {
            toastManager.error(
                'Failed to remove member',
                'Please try again later.'
            );
            log.error({msg: 'Failed to remove member', error: e});
        }
    }

    function onInviteSubmit(event: Event) {
        event.preventDefault();

        if (!inviteEmail.trim()) return;

        try {
            agent.createMember(board.id, inviteEmail.trim(), 'writer');
            inviteEmail = '';
        } catch (e) {
            toastManager.error(
                'Failed to invite member',
                'Please try again later.'
            );
            log.error({msg: 'Failed to invite member', error: e});
        }
    }
</script>

{#snippet roleOption(member: MemberView, role: MemberRole)}
    <button
        type="button"
        class="dropdown__item"
        onclick={() => changeRole(member, role)}
        disabled={!canSetTo(role)}
    >
        {displayRole(role)}
        {#if role === member.role}
            <span class="ml-auto"><CheckIcon /></span>
        {/if}
    </button>
{/snippet}

<div class="flex flex-col gap-3 my-6 modal-padding-inline">
    <div class="flex flex-col gap-1 flex-1">
        <p class="font-semibold">Who has access</p>
        <p class="font-detail text-ink-detail text-sm">
            View and manage who has access to this board and their permission
            levels
        </p>
    </div>
    {#each board.members as member (member.id)}
        <div class="flex items-center">
            <Avatar
                userId={member.id}
                name={member.fullName}
                imageUrl={member.avatarUrlSmall}
            />
            <span class="ml-1.5">{member.fullName}</span>
            <span class="ml-1.5 text-ink-detail">{member.email}</span>

            <div class="ml-auto flex gap-4">
                {#if canManage(member)}
                    <Dropdown>
                        {#snippet trigger()}
                            <div class="btn">
                                {displayRole(member.role)}
                                <ChevronDownIcon />
                            </div>
                        {/snippet}
                        {#each ['owner', 'admin', 'writer', 'reader'] as role (role)}
                            {@render roleOption(member, role as MemberRole)}
                        {/each}
                    </Dropdown>
                {:else}
                    <div class="btn disabled">
                        {displayRole(member.role)}
                    </div>
                {/if}
                {#if canRemove(member)}
                    <button class="btn" onclick={() => onRemoveClick(member)}
                        >Remove</button
                    >
                {/if}
            </div>
        </div>
    {/each}
</div>
<hr class="my-6 material-elevated" />
<div class="flex flex-col gap-3 mt-4 mb-8 modal-padding-inline">
    <div class="flex flex-col gap-1 flex-1">
        <p class="font-semibold">Invite by link</p>
        <p class="font-detail text-ink-detail text-sm">
            Anyone with this link can join and edit the board
        </p>
    </div>
    <div class="flex items-center gap-4">
        <input
            autocomplete="off"
            type="text"
            class="input input--bordered flex-grow"
            value={joinLink}
            disabled
        />
        <button
            class="btn shrink-0"
            onclick={onRefreshClick}
            disabled={isUpdating}
        >
            <RefreshIcon />
            Refresh Link
        </button>
        <button class="btn shrink-0" onclick={onCopyClick}>
            <ClipboardCopyIcon />
            Copy Link
        </button>
    </div>
    <div class="flex flex-col gap-1 flex-1 mt-3">
        <p class="font-semibold">Send invitation email</p>
        <p class="font-detail text-ink-detail text-sm">
            Link will be valid for 1 week
        </p>
    </div>
    <form onsubmit={onInviteSubmit} class="flex items-center gap-4">
        <input
            name="invite"
            autocomplete="off"
            type="email"
            class="input input--bordered flex-grow"
            bind:value={inviteEmail}
            placeholder="Enter an email address..."
            required
        />
        <button
            type="submit"
            class="btn shrink-0"
            disabled={!inviteEmail.trim() || isUpdating}
        >
            <PlusIcon />
            Invite
        </button>
    </form>
</div>
