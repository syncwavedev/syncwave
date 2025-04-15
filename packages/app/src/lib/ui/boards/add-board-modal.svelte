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
        if (name.length < 3) {
            return;
        }

        await agent.createBoard({key: name, name: name, memberEmails: []});
        modalManager.close();
        router.route(`/b/${name}`);
    }
</script>

<CommandView>
    <CommandHeader placeholder="Enter board name..." bind:filter={name} />
    <div class="modal-footer mx-2">
        <button
            type="submit"
            class="btn-ghost ml-auto"
            onclick={onCreateBoard}
            disabled={name.length < 3}
        >
            <PlusIcon />
            Create
        </button>
    </div>
</CommandView>
