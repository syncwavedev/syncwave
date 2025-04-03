<script lang="ts">
    import {commandCenter} from './command-center-manager.svelte';
</script>

{#if commandCenter.getIsOpen()}
    {@render commandCenter.getView()?.()}
{/if}
