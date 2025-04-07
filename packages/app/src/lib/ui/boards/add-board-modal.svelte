<script lang="ts">
    import CommandHeader from '../command-center/command-header.svelte';
    import CommandView from '../command-center/command-view.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';

    let filter = $state('');
</script>

<CommandView>
    <CommandHeader placeholder="Enter board name..." bind:filter />
    <hr />
    <div class="modal-footer">
        <button type="submit" class="btn-ghost">
            <PlusIcon />
            Create
        </button>
    </div>
</CommandView>
