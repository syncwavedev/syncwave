<script lang="ts">
    import {toastManager} from '../../../toast-manager.svelte';
    import {getAgent} from '../../agent/agent.svelte';
    import type {BoardView, MeView} from '../../agent/view.svelte';
    import {appConfig} from '../../../config';
    import Avatar from '../components/avatar.svelte';
    import ChevronDownIcon from '../components/icons/chevron-down-icon.svelte';
    import ClipboardCopyIcon from '../components/icons/clipboard-copy-icon.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';
    import RefreshIcon from '../components/icons/refresh-icon.svelte';

    let {board, me}: {board: BoardView; me: MeView} = $props();

    const agent = getAgent();

    const joinLink = $derived(`${appConfig.uiUrl}join/${board.joinCode}`);

    let isUpdating = $state(false);
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
</script>

<div class="flex flex-col gap-3 my-6 modal-padding-inline">
    <div class="flex flex-col gap-1 flex-1">
        <p class="font-medium">Who has access</p>
        <p class="font-detail text-ink-detail text-xs">
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
                <button class="btn hover:bg-material-elevated-hover">
                    {member.role}
                    <ChevronDownIcon />
                </button>
                {#if member.id !== me.id && member.role !== 'owner'}
                    <button class="btn hover:bg-material-elevated-hover">
                        Remove
                    </button>
                {/if}
            </div>
        </div>
    {/each}
</div>
<hr class="material-elevated" />
<div class="flex flex-col gap-2 mt-6 mb-8 modal-padding-inline">
    <div class="flex flex-col gap-1 flex-1">
        <p class="font-medium">Invite by link</p>
        <p class="font-detail text-ink-detail text-xs">
            Anyone with this link can join and edit the board
        </p>
    </div>
    <div class="flex items-center gap-4">
        <input
            autocomplete="off"
            type="text"
            class="input input--block settings-input text-ink-detail w-full"
            value={joinLink}
            disabled
        />
        <button
            class="btn hover:bg-material-elevated-hover shrink-0"
            onclick={onRefreshClick}
            disabled={isUpdating}
        >
            <RefreshIcon />
            Refresh Link
        </button>
        <button
            class="btn hover:bg-material-elevated-hover shrink-0"
            onclick={onCopyClick}
        >
            <ClipboardCopyIcon />
            Copy Link
        </button>
    </div>
    <div class="flex flex-col gap-1 flex-1 mt-3">
        <p class="font-medium">Send invintation email</p>
        <p class="font-detail text-ink-detail text-xs">
            Link will be valid for 1 week
        </p>
    </div>
    <div class="flex items-center gap-4">
        <input
            name="invite"
            autocomplete="off"
            type="email"
            class="input input--block settings-input"
            placeholder="Enter an email address..."
        />
        <button
            class="btn hover:bg-material-elevated-hover shrink-0"
            onclick={onRefreshClick}
            disabled={isUpdating}
        >
            <PlusIcon />
            Invite
        </button>
    </div>

    <div class="flex gap-4"></div>
</div>
