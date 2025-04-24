<script lang="ts">
    import type {BoardView} from '../../agent/view.svelte';
    import Avatar from '../components/avatar.svelte';
    import CrownIcon from '../components/icons/crown-icon.svelte';
    import UserMinusIcon from '../components/icons/user-minus-icon.svelte';
    import Modal from '../components/modal.svelte';

    let {board}: {board: BoardView} = $props();
</script>

<Modal title="Manage Members" size="md">
    <div class="flex flex-col mt-2">
        {#each board.members as member (member.id)}
            <div class="flex items-center py-2">
                <Avatar userId={member.id} name={member.fullName} />
                <span class="ml-1.5">{member.fullName}</span>
                <span class="ml-1.5 text-ink-detail"
                    >{member.email} [{member.role}]</span
                >
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
            class="input input-block p-2.5 mt-2"
            placeholder="Enter an email address to invite..."
        />
    </div>
</Modal>
