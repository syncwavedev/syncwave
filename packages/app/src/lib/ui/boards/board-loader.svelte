<script lang="ts">
    import type {MeView} from '../../agent/view.svelte';

    const {
        board,
    }: {
        board: MeView['boards'][number];
    } = $props();
</script>

<div
    class="flex items-center shrink-0 px-panel-inline h-panel-header border-b border-divider w-full"
>
    <p class="ml-5">
        {board.name} <span class="text-ink-detail ml-2">Syncing...</span>
    </p>
</div>
