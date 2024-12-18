<script lang="ts">
	import type { Snippet } from "svelte";

    let {
        navigationTitle,
        leading,
        trailing,
        children,
        bottomToolbar,
    }: {
        navigationTitle?: string,
        leading?: Snippet,
        trailing?: Snippet,
        children?: Snippet,
        bottomToolbar?: Snippet,
    } = $props();

    const withTopToolbar = !!navigationTitle || !!leading;
    const withBottomToolbar = !!bottomToolbar;
</script>

<div class="navigation-stack">
    {#if withTopToolbar}
        <div class="top-toolbar">
            <div class="top-toolbar__leading">
                {@render leading?.()}
            </div>
            <div class="top-toolbar__title font-medium">
                {navigationTitle}
            </div>
            <div class="top-toolbar__trailing">
                {@render trailing?.()}
            </div>
        </div>
    {/if}
    <div class="content" class:with-top-toolbar={withTopToolbar} class:with-bottom-toolbar={withBottomToolbar}>
        {@render children?.()}
    </div>
    {#if withBottomToolbar}
        <div class="bottom-toolbar">
            {@render bottomToolbar()}
        </div>
    {/if}
</div>

<style>
    .navigation-stack {
    	display: flex;
    	flex-direction: column;
    	height: 100vh;
    }

    .top-toolbar {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: var(--header-height, calc(2.2rem + env(safe-area-inset-top)));
        background-color: var(--color-subtle-light);
        display: flex;
        align-items: center;
        justify-content: space-between;

        z-index: 1000;

        /* Safe area consideration for devices with notches */
        padding-top: env(safe-area-inset-top);
    }

    .top-toolbar__title {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
    }

    .content {
        padding: 0 calc(env(safe-area-inset-left) + 0.75rem) 0 calc(env(safe-area-inset-right) + 0.75rem);
    	flex: 1 1 auto;

    	background: var(--color-bg);
    	overflow-y: auto; /* Scrollable area */
    }

    .with-top-toolbar {
        margin-top: var(--header-height, calc(2.2rem + env(safe-area-inset-top)));
    }

    .with-bottom-toolbar {
        margin-bottom: var(--footer-height, 3rem);
    }

    .bottom-toolbar {
    	background: var(--color-subtle-light);
    	position: fixed;
    	bottom: 0;
    	left: 0;
    	width: 100%;
    	height: var(--footer-height, 3rem);

    	/* Safe area consideration for devices with notches */
    	z-index: 1000;
    }
</style>
