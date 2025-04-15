<script lang="ts">
    import ChevronIcon from '../components/icons/chevron-icon.svelte';
    import TrashIcon from '../components/icons/trash-icon.svelte';
    import Modal from '../components/modal.svelte';
    import InviteMembersModal from './invite-members-modal.svelte';
    import modalManager from '../modal-manager.svelte';
    import EditColumnsModal from './edit-columns-modal.svelte';
    import type {BoardTreeView} from '../../agent/view.svelte';
    import {getAgent} from '../../agent/agent.svelte';
    import router from '../../router';

    let {board}: {board: BoardTreeView} = $props();

    const agent = getAgent();

    function onDeleteBoard() {
        const confirmMessage = `Are you sure you want to delete "${board.name}"? This action cannot be undone.`;
        if (confirm(confirmMessage)) {
            modalManager.close();
            agent.deleteBoard(board.id);
            router.route('/');
        }
    }
</script>

{#snippet inviteForm()}
    <InviteMembersModal {board} />
{/snippet}

{#snippet manageColumns()}
    <EditColumnsModal columns={board.columns} />
{/snippet}

<Modal title="Board Settings" size="md">
    <div class="flex flex-col mx-4">
        <input
            autocomplete="off"
            type="title"
            class="input py-3.5"
            placeholder="Board name"
            value={board.name}
        />
        <hr />
        <button
            class="flex w-full cursor-default items-center gap-2 py-3.5"
            onclick={() => modalManager.navigate(inviteForm, false)}
        >
            <span>Members</span>
            <span class="text-ink-body ml-auto flex items-center gap-1.5">
                <span class="text-sm">{board.members.length} members</span>
                <ChevronIcon />
            </span>
        </button>
        <hr />
        <button
            class="flex w-full cursor-default items-center gap-2 py-3.5"
            onclick={() => modalManager.navigate(manageColumns, false)}
        >
            <span>Columns</span>
            <span class="text-ink-body ml-auto flex items-center gap-1.5">
                <span class="text-sm">{board.columns.length} columns</span>
                <ChevronIcon />
            </span>
        </button>
    </div>
    <hr />
    <div class="modal-footer mx-4">
        <button class="btn-ghost mx-auto" onclick={onDeleteBoard}>
            <TrashIcon /> Delete {board.name}
        </button>
    </div>
</Modal>
