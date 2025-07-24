<script lang="ts">
    import type {Snippet} from 'svelte';

    interface Props {
        freeSide: 'left' | 'right';
        width: number;
        onWidthChange: (width: number) => void;
        children: Snippet;
        class?: string;
        minWidth: number;
        maxWidth: number;
        resizerClass?: string;
        disabled?: boolean;
    }

    let {
        freeSide,
        width,
        onWidthChange,
        children,
        minWidth,
        maxWidth,
        class: className,
        resizerClass = 'w-1 hover:bg-divider-object',
        disabled = false,
    }: Props = $props();

    let isResizing = $state(false);
    let startX = 0;
    let startWidth = 0;

    function handlePointerDown(e: PointerEvent) {
        if (disabled) return;

        isResizing = true;
        startX = e.clientX;
        startWidth = typeof width === 'number' ? width : 0;

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: PointerEvent) {
        if (!isResizing || disabled) return;

        const deltaX = e.clientX - startX;
        let newWidth =
            freeSide === 'right' ? startWidth + deltaX : startWidth - deltaX;

        if (newWidth < minWidth) {
            newWidth = minWidth;
        }

        if (newWidth > maxWidth) {
            newWidth = maxWidth;
        }

        if (newWidth !== width) {
            width = newWidth;
            onWidthChange?.(width);
        }
    }

    function handlePointerUp(e: PointerEvent) {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
</script>

<div
    class={`relative shrink-0 max-w-[100vw] flex ${className ?? ''}`}
    style={disabled ? 'width: auto;' : `width: ${width}px;`}
>
    {@render children()}

    {#if !disabled}
        <div
            class={`resizer z-50 ${resizerClass}`}
            class:cursor-col-resize={!disabled}
            class:select-none={isResizing}
            style="position: absolute; {freeSide}: 0; top: 0; bottom: 0;"
            onpointerdown={handlePointerDown}
            onpointermove={handlePointerMove}
            onpointerup={handlePointerUp}
            onpointercancel={handlePointerUp}
        ></div>
    {/if}
</div>
