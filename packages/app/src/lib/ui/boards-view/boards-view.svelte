<script lang="ts">
    import type {Board} from 'syncwave';
    import HashtagIcon from '../components/icons/hashtag-icon.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';

    const {
        boards,
    }: {
        boards: Board[];
    } = $props();
</script>

<div
    class="border-divider border-r z-10 flex w-full flex-shrink-0 flex-col bg-sidebar"
>
    <div class="flex items-center px-panel-inline h-panel-header">
        <div class="flex flex-col gap-1">
            <p class="font-semibold">All Boards</p>
            <p class="text-ink-detail text-xs">
                {boards.length}
                {boards.length === 1 ? 'board' : 'boards'}
            </p>
        </div>
        <button class="btn btn--icon ml-auto">
            <PlusIcon />
        </button>
    </div>
    <div class="flex flex-col py-1.5">
        {#each boards as board (board.id)}
            <div
                class="mx-panel-inline-half px-panel-inline-half rounded-md hover:bg-material-1-hover py-1.5"
            >
                <p><span class="mr-1.5"><HashtagIcon /></span> {board.name}</p>
            </div>
        {/each}
    </div>
</div>
