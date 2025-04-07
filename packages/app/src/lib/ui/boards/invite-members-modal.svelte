<script lang="ts">
    import Avatar from '../components/avatar.svelte';
    import Modal from '../components/modal.svelte';
</script>

<Modal title="Invite to Collaborate" size="md">
    <div class="flex flex-col mx-4 my-3">
        <input
            autocomplete="off"
            type="email"
            class="input input-block mb-2"
            placeholder="Enter an email address..."
            autofocus
        />
        <div class="flex items-center h-[2.25em]">
            <Avatar name="D" />
            <span class="ml-1.5">d3witt@duck.com</span>
            <button class="btn-ghost ml-auto text-ink-body"> Cancel </button>
        </div>
    </div>
</Modal>
