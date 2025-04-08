<script lang="ts">
    import ChevronIcon from '../components/icons/chevron-icon.svelte';
    import TrashIcon from '../components/icons/trash-icon.svelte';
    import Modal from '../components/modal.svelte';
    import InviteMembersModal from './invite-members-modal.svelte';
    import modalManager from '../modal-manager.svelte';
</script>

{#snippet inviteForm()}
    <InviteMembersModal />
{/snippet}

<Modal title="Board Settings" size="md">
    <div class="flex flex-col mx-4">
        <input
            autocomplete="off"
            type="title"
            class="input h-[3.25em]"
            placeholder="Board name"
            value="Andrei's Board"
        />
        <hr />
        <button
            class="flex w-full cursor-default items-center gap-2 h-[3.25em]"
            onclick={() => modalManager.navigate(inviteForm, false)}
        >
            <span>Members</span>
            <span class="text-ink-body ml-auto flex items-center gap-1.5">
                <span class="text-sm">View members</span>
                <ChevronIcon />
            </span>
        </button>
        <hr />
        <button
            class="flex w-full cursor-default items-center gap-2 h-[3.25em]"
        >
            <span>Columns</span>
            <span class="text-ink-body ml-auto flex items-center gap-1.5">
                <span class="text-sm">Edit columns</span>
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
