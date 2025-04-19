<script lang="ts">
    import {Portal} from 'bits-ui';
    import type {Snippet} from 'svelte';
    import modalManager from '../modal-manager.svelte';

    let {
        children,
    }: {
        children: Snippet;
    } = $props();
</script>

<Portal>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
        role="region"
        class="
          fixed
          top-0
          left-0
          z-[1000]
          flex
          h-screen
          w-screen
          items-center
          justify-center"
        onclick={() => modalManager.close()}
    ></div>

    <div
        class="
          bg-surface-1
          fixed
          top-12
          left-1/2
          z-[1000]
          w-full
          max-w-lg
          -translate-x-1/2
          rounded-lg
          shadow-lg
          border
          border-divider-subtle
        "
    >
        {@render children()}
    </div>
</Portal>
