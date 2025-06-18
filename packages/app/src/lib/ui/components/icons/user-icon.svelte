<script lang="ts">
    const {
        strokeWidth,
    }: {
        strokeWidth?: number;
    } = $props();
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width={strokeWidth ?? 1.5}
    stroke-linecap="round"
    stroke-linejoin="round"
    class="icon"
    ><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></svg
>
