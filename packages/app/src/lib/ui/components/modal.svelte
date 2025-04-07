<script lang="ts">
    import {Portal} from 'bits-ui';
    import ScrollArea from '../../components/scroll-area.svelte';
    import type {Snippet} from 'svelte';
    import TimesIcon from './icons/times-icon.svelte';

    let {
        title,
        children,
        footer,
        size = 'md',
    }: {
        title: string;
        children: Snippet;
        footer?: Snippet;
        size?: 'xs' | 'sm' | 'md' | 'lg';
    } = $props();
</script>

{#if true}
    <Portal>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
            role="region"
            class="fixed top-0 left-0 z-[1000] flex h-screen w-screen items-center justify-center"
            onclick={() => history.back()}
        ></div>

        <div
            class="bg-surface-1 fixed top-12 left-1/2 z-[1000] w-full -translate-x-1/2 rounded-lg shadow-lg border border-divider"
            class:max-w-[20rem]={size === 'xs'}
            class:max-w-sm={size === 'sm'}
            class:max-w-md={size === 'md'}
            class:max-w-lg={size === 'lg'}
        >
            <ScrollArea orientation="both">
                <div class="shirnk-0 flex flex-col">
                    <div class="modal-header">
                        <p class="font-semibold">{title}</p>
                        <button
                            class="btn--icon ml-auto"
                            onclick={() => history.back()}
                        >
                            <TimesIcon />
                        </button>
                    </div>
                    <hr />
                    <ScrollArea orientation="both" class="h-full">
                        {@render children()}
                    </ScrollArea>
                    {#if footer}
                        <hr />
                        {@render footer()}
                    {/if}
                </div>
            </ScrollArea>
        </div>
    </Portal>
{/if}
