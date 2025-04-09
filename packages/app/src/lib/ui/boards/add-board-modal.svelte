<script lang="ts">
    import CommandHeader from '../command-center/command-header.svelte';
    import CommandView from '../command-center/command-view.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';

    let filter = $state('');
</script>

<CommandView>
    <CommandHeader placeholder="Enter board name..." bind:filter />
    <div class="modal-footer mx-2">
        <button type="submit" class="btn-ghost ml-auto">
            <PlusIcon />
            Create
        </button>
    </div>
</CommandView>
