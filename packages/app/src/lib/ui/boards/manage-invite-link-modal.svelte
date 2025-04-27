<script lang="ts">
    import type {BoardView} from '../../agent/view.svelte';
    import ClipboardCopyIcon from '../components/icons/clipboard-copy-icon.svelte';
    import Modal from '../components/modal.svelte';
    import RefreshIcon from '../components/icons/refresh-icon.svelte';
    import {appConfig} from '../../config';
    import {getAgent} from '../../agent/agent.svelte';

    let {board}: {board: BoardView} = $props();

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
    }
</script>

<Modal title="Manage Invite Link" size="md">
    <div class="flex flex-col items-center gap-3 my-4 modal-padding-inline">
        <p>Anyone with this link can join and edit the board</p>
        <input
            autocomplete="off"
            type="text"
            class="input input--block text-ink-detail p-2.5 w-full"
            value={joinLink}
            disabled
        />

        <div class="flex gap-4 icon-lg">
            <button
                class="btn--icon btn--icon--bordered btn--icon--lg"
                onclick={onRefreshClick}
                disabled={isUpdating}
            >
                <RefreshIcon />
            </button>
            <button
                class="btn--icon btn--icon--bordered btn--icon--lg"
                onclick={onCopyClick}
            >
                <ClipboardCopyIcon />
            </button>
        </div>
    </div>
</Modal>
