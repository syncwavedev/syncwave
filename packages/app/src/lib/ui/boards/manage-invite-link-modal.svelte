<script lang="ts">
    import type {BoardView} from '../../agent/view.svelte';
    import ClipboardCopyIcon from '../components/icons/clipboard-copy-icon.svelte';
    import Modal from '../components/modal.svelte';
    import RefreshIcon from '../components/icons/refresh-icon.svelte';
    import {appConfig} from '../../config';

    let {board}: {board: BoardView} = $props();

    const joinLink = $derived(`${appConfig.uiUrl}join/${board.joinCode}`);
</script>

<Modal title="Manage Invite Link" size="md">
    <div class="flex flex-col items-center gap-3 my-4 modal-padding-inline">
        <p>Anyone with this link can join and edit the board</p>
        <input
            autocomplete="off"
            type="text"
            class="input input-block text-ink-detail p-2.5 w-full"
            value={joinLink}
            disabled
        />

        <div class="flex gap-4 text-ink-body">
            <button class="btn-ghost">
                <RefreshIcon />
                Refresh Link
            </button>
            <button class="btn-ghost">
                <ClipboardCopyIcon />
                Copy Link
            </button>
        </div>
    </div>
</Modal>
