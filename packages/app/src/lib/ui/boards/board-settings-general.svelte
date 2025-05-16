<script lang="ts">
    import modalManager from '../modal-manager.svelte';
    import type {BoardTreeView} from '../../agent/view.svelte';
    import {getAgent} from '../../agent/agent.svelte';
    import router from '../../router';
    import BoardHistoryManager from '../../board-history-manager';
    import permissionManager from '../../../permission-manager';

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
            agent.deleteMember(board.memberId);
            router.route('/');
        }
    }
</script>

<div class="flex items-center gap-6 flex-1 modal-padding-inline py-6">
    <div class="flex flex-col gap-1 flex-1">
        <p class="font-medium flex-1">Choose board name</p>
        <p class="font-detail text-ink-detail text-xs">
            Use clear, unique names for easier board navigation.
        </p>
    </div>
    <input
        autocomplete="off"
        type="text"
        class="input input--block settings-input max-w-48"
        placeholder="Not set"
        oninput={e =>
            agent.setBoardName(board.id, (e.target as HTMLInputElement).value)}
        value={board.name}
    />
</div>
<hr class="material-elevated" />
<div class="flex flex-col modal-padding-inline pt-6 pb-8 gap-4">
    {#if permissionManager.hasPermission('delete:board')}
        <div class="flex items-center">
            <div class="flex flex-col gap-1 flex-1">
                <p class="font-medium">Delete board</p>
                <p class="font-detail text-ink-detail text-xs">
                    All data, for all members, will be deleted forever.
                </p>
            </div>
            <div class="block-inline">
                <button
                    class="settings-element bg-material-elevated-element rounded-sm"
                    onclick={onDeleteBoard}
                >
                    Delete board
                </button>
            </div>
        </div>
    {/if}

    <div class="flex items-center">
        <div class="flex flex-col gap-1 flex-1">
            <p class="font-medium">Leave board</p>
            <p class="font-detail text-ink-detail text-xs">
                All local data will be cleared and the page will be refreshed.
            </p>
        </div>
        <div class="block-inline">
            <button
                class="settings-element bg-material-elevated-element rounded-sm"
                onclick={onLeaveBoard}
            >
                Leave board
            </button>
        </div>
    </div>
</div>
