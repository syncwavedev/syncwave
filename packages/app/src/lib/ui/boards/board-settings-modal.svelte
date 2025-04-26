<script lang="ts">
    import ChevronIcon from '../components/icons/chevron-icon.svelte';
    import Modal from '../components/modal.svelte';
    import InviteMembersModal from './invite-members-modal.svelte';
    import modalManager from '../modal-manager.svelte';
    import EditColumnsModal from './edit-columns-modal.svelte';
    import type {BoardTreeView} from '../../agent/view.svelte';
    import {getAgent} from '../../agent/agent.svelte';
    import router from '../../router';
    import ManageInviteLinkModal from './manage-invite-link-modal.svelte';
    import BoardHistoryManager from '../../board-history-manager';

    let {board}: {board: BoardTreeView} = $props();

    const agent = getAgent();

    function onDeleteBoard() {
        const confirmMessage = `Are you sure you want to delete "${board.name}"? This action cannot be undone.`;
        if (confirm(confirmMessage)) {
            modalManager.close();
            BoardHistoryManager.clear();
            agent.deleteBoard(board.id);
            router.route('/');
        }
    }

    function onLeaveBoard() {
        const confirmMessage = `Are you sure you want to leave "${board.name}"? You'll lose access to this board.`;
        if (confirm(confirmMessage)) {
            modalManager.close();
            BoardHistoryManager.clear();
            // TODO: add agent.leaveBoard(board.id);
            router.route('/');
        }
    }
</script>

{#snippet inviteForm()}
    <InviteMembersModal {board} />
{/snippet}

{#snippet manageColumns()}
    <EditColumnsModal {board} />
{/snippet}

{#snippet manageInviteLink()}
    <ManageInviteLinkModal {board} />
{/snippet}

<Modal title="Board Settings" size="md">
    <div class="flex modal-padding-inline mt-3">
        <input
            autocomplete="off"
            type="title"
            class="input input-block p-2.5"
            placeholder="Board name"
            oninput={e =>
                agent.setBoardName(
                    board.id,
                    (e.target as HTMLInputElement).value
                )}
            value={board.name}
        />
    </div>
    <hr class="mt-4 mb-1 material-elevated" />
    <div role="menu" class="flex flex-col">
        <button
            role="menuitem"
            class="menu__item"
            onclick={() => modalManager.navigate(inviteForm, false)}
        >
            <span>Members</span>
            <span class="text-ink-body ml-auto flex items-center gap-1.5">
                <span class="text-sm">{board.members.length} members</span>
                <ChevronIcon />
            </span>
        </button>
        <button
            role="menuitem"
            class="menu__item"
            onclick={() => modalManager.navigate(manageColumns, false)}
        >
            <span>Columns</span>
            <span class="text-ink-body ml-auto flex items-center gap-1.5">
                <span class="text-sm">{board.columns.length} columns</span>
                <ChevronIcon />
            </span>
        </button>
        <button
            role="menuitem"
            class="menu__item"
            onclick={() => modalManager.navigate(manageInviteLink, false)}
        >
            <span>Invite Link</span>
            <span class="text-ink-body ml-auto flex items-center gap-1.5">
                <span class="text-sm">Manage</span>
                <ChevronIcon />
            </span>
        </button>
    </div>
    <hr class="my-1 material-elevated" />
    <button role="menuitem" class="menu__item" onclick={onLeaveBoard}>
        Leave Board
        <span class="text-ink-body ml-auto flex items-center gap-1.5">
            <span class="text-sm">You'll lose access to this board</span>
        </span>
    </button>
    <button
        role="menuitem"
        class="menu__item mb-1 text-ink-danger"
        onclick={onDeleteBoard}
    >
        Delete Board
        <span class="text-ink-body ml-auto flex items-center gap-1.5">
            <span class="text-sm">This action cannot be undone</span>
        </span>
    </button>
</Modal>

<style>
    .menu__item {
        display: flex;
        align-items: center;
        width: 100%;
        cursor: default;
        gap: 0.5rem;
        padding-inline: var(--modal-padding-inline);
        padding-block: 0.75rem;

        &:hover {
            background: var(--color-material-elevated-hover);
        }
    }
</style>
