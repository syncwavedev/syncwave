<script lang="ts">
    import {Portal} from 'bits-ui';
    import type {Snippet} from 'svelte';
    import TimesIcon from './icons/times-icon.svelte';
    import modalManager from '../modal-manager.svelte';

    let {
        title,
        children,
        size = 'md',
    }: {
        title: string;
        children: Snippet;
        size?: 'xs' | 'sm' | 'md' | 'lg';
    } = $props();
</script>

{#if true}
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
              justify-center
              backdrop-blur-xs
              bg-black/10
              dark:bg-black/25
            "
            onclick={() => modalManager.close()}
        ></div>

        <div
            class="
              bg-surface-0
              fixed
              top-12
              left-1/2
              z-[1000]
              w-full
              -translate-x-1/2
              rounded-lg
              shadow-lg
              dark:border
              border-divider-subtle
              py-3
              px-5
            "
            class:max-w-[20rem]={size === 'xs'}
            class:max-w-sm={size === 'sm'}
            class:max-w-[28rem]={size === 'md'}
            class:max-w-lg={size === 'lg'}
        >
            <div class="flex items-center">
                <p class="font-semibold text-lg">{title}</p>
                <button
                    class="btn--icon ml-auto text-ink-body bg-surface-2"
                    onclick={() => modalManager.close()}
                >
                    <TimesIcon />
                </button>
            </div>
            {@render children()}
        </div>
    </Portal>
{/if}
