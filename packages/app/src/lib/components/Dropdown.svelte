<script lang="ts">
    import type {Snippet} from 'svelte';

    type Props = {
        children: Snippet;
        trigger: Snippet;
        class?: string;
        placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
        closeOnItemClick?: boolean;
    };

    let {
        children,
        trigger,
        class: className = '',
        placement = 'bottom-end',
        closeOnItemClick = true,
    }: Props = $props();
    let detailsEl = $state<HTMLDetailsElement>();

    function handleOutsideClick(event: Event) {
        if (detailsEl && !detailsEl.contains(event.target as Node)) {
            detailsEl.open = false;
        }
    }

    function handleContentClick(event: Event) {
        if (!closeOnItemClick) return;

        const target = event.target as HTMLElement;
        // Close if clicked element is a button, link, or has data-close-menu attribute
        if (
            target.matches('button, a, [data-close-menu]') ||
            target.closest('button, a, [data-close-menu]')
        ) {
            detailsEl!.open = false;
        }
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            detailsEl!.open = false;
        }
    }

    $effect(() => {
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    });
</script>

<details bind:this={detailsEl} class="dropdown {className}">
    <summary class="dropdown__trigger">
        {@render trigger()}
    </summary>

    <div
        role="menu"
        tabindex="0"
        class="dropdown__content dropdown__content--{placement}"
        onclick={handleContentClick}
        onkeydown={handleKeyDown}
    >
        {@render children()}
    </div>
</details>
