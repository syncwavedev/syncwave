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
        size?: 'sm' | 'md' | 'lg';
    } = $props();
</script>

{#if true}
    <Portal>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
            role="region"
            class="modal__overlay"
            onclick={() => modalManager.close()}
        ></div>

        <div class={`modal modal--${size}`}>
            <div class="flex items-center modal-padding-inline">
                <p class="font-medium text-lg">{title}</p>
                <button
                    class="btn--icon ml-auto text-ink-body"
                    onclick={() => modalManager.close()}
                >
                    <TimesIcon />
                </button>
            </div>
            {@render children()}
        </div>
    </Portal>
{/if}
