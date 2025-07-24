<script lang="ts">
    import modalManager from '../managers/modal-manager.svelte';
</script>

{#if modalManager.getIsOpen()}
    {@render modalManager.getView()?.()}
{/if}
