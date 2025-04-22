<script lang="ts">
    import type {Component, Snippet} from 'svelte';

    let {
        icon: Icon,
        label,
        trailing,
        onclick,
    }: {
        icon: Component;
        label: string;
        trailing?: Snippet;
        onclick?: () => void;
    } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
    role="menuitem"
    class="
      flex
      items-center
      gap-1.5
      px-2
      py-2.5
      hover:bg-surface-3
      rounded-md
      cursor-default
    "
    {onclick}
    tabindex="0"
>
    <Icon />
    <span>{label}</span>
    {#if trailing}
        <div class="ml-auto">
            {@render trailing()}
        </div>
    {/if}
</div>
