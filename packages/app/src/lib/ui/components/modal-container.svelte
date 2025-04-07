<script lang="ts">
    import modalManager from '../modal-manager.svelte';
</script>

{#if modalManager.getIsOpen()}
    {@render modalManager.getView()?.()}
{/if}
