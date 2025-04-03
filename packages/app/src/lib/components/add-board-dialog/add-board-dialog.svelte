<script lang="ts">
    import {getRpc} from '$lib/utils';
    import {BusinessError, createBoardId, log, toError} from 'syncwave';
    import AddBoardDialogSettings from './add-board-dialog-board-settings.svelte';
    import AddBoardDialogMemberList from './add-board-dialog-member-list.svelte';
    import Dialog from '../dialog.svelte';
    import {goto} from '$app/navigation';
    import {getBoardRoute} from '$lib/routes';

    interface Props {
        open: boolean;
        onClose: () => void;
    }

    let route: 'settings' | 'members' = $state('settings');

    let {open, onClose}: Props = $props();

    function reset() {
        route = 'settings';
    }

    let name = $state('');
    let key = $state('');
    let members = $state<string[]>([]);

    const rpc = getRpc();

    async function createBoard() {
        try {
            await rpc(x =>
                x.createBoard({boardId: createBoardId(), key, name, members})
            );
            onClose();
            goto(getBoardRoute(key.toUpperCase()));
        } catch (e) {
            if (e instanceof BusinessError) {
                if (e.code === 'board_key_taken') {
                    alert(
                        `Sorry, board with key "${key}" already exists. Please choose another one.`
                    );
                    route = 'settings';
                }
            } else {
                alert('Sorry, something went wrong. Please try again later.');
                log.error(toError(e), 'Failed to create board');
            }
        }
    }

    function close() {
        reset();
        onClose();
    }
</script>

<Dialog {open} onClose={close}>
    {#if route === 'settings'}
        <AddBoardDialogSettings
            bind:name
            bind:key
            onClose={close}
            onNext={() => (route = 'members')}
        />
    {/if}
    {#if route === 'members'}
        <AddBoardDialogMemberList
            bind:members
            onBack={() => (route = 'settings')}
            onDone={createBoard}
        />
    {/if}
</Dialog>
