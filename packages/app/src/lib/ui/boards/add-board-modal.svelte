<script lang="ts">
    import {getAgent} from '../../agent/agent.svelte';
    import router from '../../router';
    import CommandHeader from '../command-center/command-header.svelte';
    import CommandView from '../command-center/command-view.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';
    import modalManager from '../modal-manager.svelte';

    let name = $state('');

    const agent = getAgent();

    async function onCreateBoard() {
        if (name.length < 1) {
            return;
        }

        const board = await agent.createBoard({name: name, memberEmails: []});
        modalManager.close();
        router.route(`/b/${board.key}`);
    }
</script>

<CommandView>
    <CommandHeader placeholder="Enter board name..." bind:filter={name} />
    <div class="flex justify-end mr-3 py-2">
        <button
            type="submit"
            class="btn-ghost"
            onclick={onCreateBoard}
            disabled={name.length < 1}
        >
            <PlusIcon />
            Create New Board
        </button>
    </div>
</CommandView>
