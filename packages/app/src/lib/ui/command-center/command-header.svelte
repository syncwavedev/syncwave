<script lang="ts">
    let {
        placeholder,
        filter = $bindable(''),
        onsubmit,
    }: {
        placeholder: string;
        filter: string;
        onsubmit?: () => void;
    } = $props();
</script>

<div class="p-3" {onsubmit}>
    <!-- svelte-ignore a11y_autofocus -->
    <form class="h-full w-full">
        <input
            autocomplete="off"
            type="text"
            class="input h-full w-full"
            bind:value={filter}
            {placeholder}
            autofocus
        />
    </form>
</div>
<hr class="divider" />
