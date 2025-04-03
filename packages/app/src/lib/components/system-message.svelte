<script lang="ts">
    interface Props {
        author: string;
        message: string;
    }

    let {author, message}: Props = $props();
</script>

<div class="mb-4 flex items-center justify-center">
    <div class="bg-subtle-1 dark:bg-subtle-2 text-3xs rounded-xl px-2 py-0.5">
        <span class="font-semibold">{author}</span>
        <span class="text-ink-detail">{message}</span>
    </div>
</div>
