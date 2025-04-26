<script lang="ts">
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
    <div class="modal-padding-inline mt-3 flex">
        <input
            autocomplete="off"
            type="title"
            class="input input-block p-2.5"
            placeholder="Profile name"
            value={me.fullName}
            oninput={handleNameChange}
        />
    </div>

    <div class="flex justify-center my-4">
        <button
            class="btn--icon btn--icon--bordered btn--icon--lg icon-lg"
            onclick={() => authManager.logOut({pageReload: true})}
        >
            <LogOutIcon />
        </button>
    </div>
</Modal>
