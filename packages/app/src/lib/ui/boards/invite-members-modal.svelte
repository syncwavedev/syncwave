<script lang="ts">
    import type {BoardView} from '../../agent/view.svelte';
    import Avatar from '../components/avatar.svelte';
    import ClipboardCopyIcon from '../components/icons/clipboard-copy-icon.svelte';
    import CrownIcon from '../components/icons/crown-icon.svelte';
    import UserMinusIcon from '../components/icons/user-minus-icon.svelte';
    import Modal from '../components/modal.svelte';
    import RefreshIcon from '../components/icons/refresh-icon.svelte';

    let {board}: {board: BoardView} = $props();
</script>

<Modal title="Manage Members" size="md">
    <div class="flex flex-col mx-4 mt-2.5 mb-4">
        {#each board.members as member (member.id)}
            <div class="flex items-center py-1">
                <Avatar name={member.fullName} />
                <span class="ml-1.5">{member.fullName}</span>
                <button class="btn--icon ml-auto text-ink-body mr-2">
                    <CrownIcon />
                </button>
                <button class="btn--icon text-ink-body">
                    <UserMinusIcon />
                </button>
            </div>
        {/each}
        <input
            name="invite"
            autocomplete="off"
            type="email"
            class="input input-block py-2.5 bg-surface-0 mt-2"
            placeholder="Enter an email address to invite..."
        />
        <hr class="my-4" />
        <p class="text-center mb-2">
            Anyone with this link can join and edit the board
        </p>
        <input
            autocomplete="off"
            type="text"
            class="input input-block text-ink-detail py-2.5 bg-surface-0 mb-2"
            value="https://syncwave.dev/b/SYNC/join?code=12312312345qweqwe-123qwe-ewq"
            disabled
        />
        <div class="flex justify-center">
            <button class="btn-ghost text-ink-body mr-2">
                <RefreshIcon />
                Refresh Link
            </button>
            <button class="btn-ghost text-ink-body">
                <ClipboardCopyIcon />
                Copy Link
            </button>
        </div>
    </div>
</Modal>
