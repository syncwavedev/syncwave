<script lang="ts">
    import {Portal} from 'bits-ui';
    import ScrollArea from '../../components/scroll-area.svelte';
    import type {Snippet} from 'svelte';

    let {
        children,
        footer,
    }: {
        children: Snippet;
        footer: Snippet;
    } = $props();
</script>

{#if true}
    <Portal>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
            role="region"
            class="fixed top-0 left-0 z-[1000] flex h-screen w-screen items-center justify-center"
            onclick={() => {}}
        ></div>

        <div
            class="bg-surface-1 fixed top-12 left-1/2 z-[1000] w-full max-w-xl -translate-x-1/2 rounded-lg shadow-lg border border-divider text-sm"
        >
            <ScrollArea class="max-h-dialog" orientation="both">
                <div class="h-dialog flex flex-col">
                    <div class="shrink-0">
                        <form class="my-1 flex h-[2.5em] items-center px-4">
                            <!-- <button
                                type="button"
                                onclick={() => {}}
                                class="btn--icon"
                            >
                                <ArrowLeft />
                            </button> -->
                            <!-- svelte-ignore a11y_autofocus -->
                            <input
                                autocomplete="off"
                                type="email"
                                class="input ml-1.5"
                                placeholder="Find a board..."
                                autofocus
                            />
                            <input
                                type="submit"
                                class="hidden"
                                value="Add member"
                            />
                        </form>
                        <hr />
                    </div>
                    <div class="min-h-0 flex-1">
                        <ScrollArea orientation="both" class="h-full">
                            {@render children()}
                        </ScrollArea>
                    </div>
                    <div class="shrink-0">
                        <hr />
                        {@render footer()}
                    </div>
                </div>
            </ScrollArea>
        </div>
    </Portal>
{/if}
