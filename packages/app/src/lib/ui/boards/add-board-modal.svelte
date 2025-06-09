<script lang="ts">
    import {getAgent} from '../../agent/agent.svelte';
    import router from '../../router';
    import CommandHeader from '../command-center/command-header.svelte';
    import CommandView from '../command-center/command-view.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';
    import modalManager from '../modal-manager.svelte';

    let name = $state('');

    const agent = getAgent();

    let isSubmitting = $state(false);

    async function onCreateBoard(event: Event) {
        event.preventDefault();

        if (name.length < 1) {
            return;
        }

        try {
            isSubmitting = true;

            const board = await agent.createBoard({
                name: name,
                memberEmails: [],
            });
            modalManager.close();
            router.route(`/b/${board.key}`);
        } finally {
            isSubmitting = false;
        }
    }
</script>

<CommandView>
    <form onsubmit={onCreateBoard}>
        <CommandHeader placeholder="Enter board name..." bind:filter={name} />
        <div class="flex justify-end mr-3 py-2">
            <button
                type="submit"
                class="btn hover:bg-material-elevated-hover"
                disabled={name.length < 1 || isSubmitting}
            >
                <PlusIcon />
                Create New Board
            </button>
        </div>
    </form>
</CommandView>
