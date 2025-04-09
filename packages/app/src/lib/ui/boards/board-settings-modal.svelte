<script lang="ts">
    import ChevronIcon from '../components/icons/chevron-icon.svelte';
    import TrashIcon from '../components/icons/trash-icon.svelte';
    import Modal from '../components/modal.svelte';
    import InviteMembersModal from './invite-members-modal.svelte';
    import modalManager from '../modal-manager.svelte';
    import EditColumnsModal from './edit-columns-modal.svelte';
    import type {BoardView} from '../../agent/view.svelte';

    let {board}: {board: BoardView} = $props();
</script>

{#snippet inviteForm()}
    <InviteMembersModal {board} />
{/snippet}

{#snippet manageColumns()}
    <EditColumnsModal />
{/snippet}

<Modal title="Board Settings" size="md">
    <div class="flex flex-col mx-4">
        <input
            autocomplete="off"
            type="title"
            class="input h-[3.5em]"
            placeholder="Board name"
            value={board.name}
        />
        <hr />
        <button
            class="flex w-full cursor-default items-center gap-2 h-[3.5em]"
            onclick={() => modalManager.navigate(inviteForm, false)}
        >
            <span>Members</span>
            <span class="text-ink-body ml-auto flex items-center gap-1.5">
                <span class="text-sm">Manage members</span>
                <ChevronIcon />
            </span>
        </button>
        <hr />
        <button
            class="flex w-full cursor-default items-center gap-2 h-[3.5em]"
            onclick={() => modalManager.navigate(manageColumns, false)}
        >
            <span>Columns</span>
            <span class="text-ink-body ml-auto flex items-center gap-1.5">
                <span class="text-sm">Manage columns</span>
                <ChevronIcon />
            </span>
        </button>
    </div>
    <hr />
    <div class="modal-footer mx-2">
        <button class="btn-ghost">
            <TrashIcon /> Delete
        </button>
    </div>
</Modal>
