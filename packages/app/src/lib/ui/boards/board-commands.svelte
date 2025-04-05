<script lang="ts">
    import CommandView from '../command-center/command-view.svelte';
    import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
    import HashtagIcon from '../components/icons/hashtag-icon.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';
</script>

<CommandView>
    <div class="flex flex-col py-1 px-1">
        <div
            class="flex items-center gap-1.5 py-1 px-2 hover:bg-surface-2 rounded-md"
        >
            <PlusIcon />
            <span>New Board</span>
        </div>
        <div
            class="flex items-center gap-1.5 py-1 px-2 hover:bg-surface-2 rounded-md"
        >
            <HashtagIcon />
            <span>Syncwave</span>
            <button class="btn--icon text-base ml-auto">
                <span class="text-[20px]"><EllipsisIcon /></span>
            </button>
        </div>
    </div>
</CommandView>
