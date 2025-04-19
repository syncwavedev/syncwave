<script lang="ts">
    import TrashIcon from '../components/icons/trash-icon.svelte';
    import Modal from '../components/modal.svelte';

    import {getAgent} from '../../agent/agent.svelte';
    import type {MeView} from '../../agent/view.svelte';
    import LogOutIcon from '../components/icons/log-out-icon.svelte';
    import {getAuthManager} from '../../utils';

    let {me}: {me: MeView} = $props();

    const agent = getAgent();
    const authManager = getAuthManager();

    function handleNameChange(event: Event) {
        if ((event.target as HTMLInputElement).value.length < 1) {
            return;
        }

        agent.setProfileFullName(
            me.id,
            (event.target as HTMLInputElement).value
        );
    }
</script>

<Modal title="Profile Settings" size="sm">
    <div class="flex flex-col my-4 gap-4">
        <input
            autocomplete="off"
            type="title"
            class="input input-block p-2.5"
            placeholder="Profile name"
            value={me.fullName}
            onchange={handleNameChange}
        />
    </div>
    <div class="flex justify-center">
        <button class="btn-ghost" onclick={() => authManager.logOut(true)}>
            <LogOutIcon /> Log out
        </button>
    </div>
</Modal>
