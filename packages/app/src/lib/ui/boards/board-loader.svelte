<script lang="ts">
    import type {MeView} from '../../agent/view.svelte';
    import Loader from '../components/icons/loader.svelte';

    const {
        board,
    }: {
        board: MeView['boards'][number];
    } = $props();
</script>

<div
    class="flex items-center shrink-0 px-board-inline h-panel-header avatar-xs gap-2"
>
    <div class="flex flex-col gap-1">
        <p class="font-semibold">{board.name}</p>
        <p class="text-ink-detail text-xs">No members data</p>
    </div>
    <span class="ml-2 animate-spin"><Loader /></span>
</div>
