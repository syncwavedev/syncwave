<script lang="ts">
    import Modal from '../components/modal.svelte';

    import {getAgent} from '../../agent/agent.svelte';
    import type {MeView} from '../../agent/view.svelte';
    import AvatarInput from '../components/avatar-input.svelte';

    let {me}: {me: MeView} = $props();

    const agent = getAgent();

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

<Modal size="xl">
    <p class="mt-3 mb-6 font-semibold text-center">Profile Settings</p>
    <div class="modal-padding-inline flex gap-8">
        <div class="flex flex-col items-center gap-3">
            <p class="font-medium">Profile Picture</p>
            <AvatarInput />
        </div>
        <div class="flex flex-col gap-3 flex-1">
            <p class="font-medium">Profile Details</p>
            <div class="flex items-center gap-2">
                <p class=" flex-1">Name</p>
                <input
                    autocomplete="off"
                    type="text"
                    class="input input--block settings-input max-w-52"
                    placeholder="Profile name"
                    value={me.fullName}
                    oninput={handleNameChange}
                />
            </div>
            <div class="flex items-center gap-2">
                <p class="flex-1">Email</p>
                <p>arey@hey.com</p>
            </div>
        </div>
    </div>
    <hr class="my-6 material-elevated" />
    <div class="flex flex-col modal-padding-inline mb-8 gap-4">
        <div class="flex items-center">
            <div class="flex flex-col gap-1 flex-1">
                <p class="font-medium">Delete Account</p>
                <p class="text-ink-detail text-xs">
                    All data, including board will be deleted forever.
                </p>
            </div>
            <div class="block-inline">
                <button
                    class="settings-element bg-material-elevated-element rounded-sm"
                >
                    Delete account
                </button>
            </div>
        </div>
        <div class="flex items-center">
            <div class="flex flex-col gap-1 flex-1">
                <p class="font-medium">Sign Out</p>
                <p class="text-ink-detail text-xs">
                    All local data will be clear, page refreshed.
                </p>
            </div>
            <div class="block-inline">
                <button
                    class="settings-element bg-material-elevated-element rounded-sm"
                >
                    Sign Out
                </button>
            </div>
        </div>
    </div>
</Modal>
