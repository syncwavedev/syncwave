<script lang="ts">
    import type {BoardDto} from 'syncwave';

    import HashtagIcon from './icons/hashtag-icon.svelte';

    let {board}: {board: BoardDto} = $props();
</script>

<a
    href={`/app/b/${board.key}`}
    class="text-ink-body hover-text-ink hover-surface-1 flex w-full cursor-pointer! items-center gap-2 rounded-lg p-2"
>
    <HashtagIcon />
    <span class="truncate leading-snug">
        {board.name}
    </span>
</a>
