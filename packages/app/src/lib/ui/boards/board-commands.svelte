<script lang="ts">
    import CommandView from '../command-center/command-view.svelte';
    import Avatar from '../components/avatar.svelte';
    import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
    import HashtagIcon from '../components/icons/hashtag-icon.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';
</script>

{#snippet footer()}
    <div class="py-2 px-4">
        <div class="flex items-center gap-2 py-1">
            <div class="text-[1.5em]"><Avatar name="AB" /></div>
            Andrei Bardziukou
        </div>
    </div>
{/snippet}

<CommandView {footer}>
    <div class="flex flex-col py-1 px-1">
        <div
            class="flex items-center gap-2 py-1 px-2 hover:bg-surface-1 rounded-md"
        >
            <div class="btn--icon border border-divider">
                <PlusIcon />
            </div>
            <span>New Board</span>
        </div>
        <div
            class="flex items-center gap-2 py-1 px-2 hover:bg-surface-1 rounded-md"
        >
            <div class="btn--icon border border-divider">
                <HashtagIcon />
            </div>
            <span>Syncwave</span>
            <button class="btn--icon text-lg ml-auto">
                <EllipsisIcon />
            </button>
        </div>
    </div>
</CommandView>
