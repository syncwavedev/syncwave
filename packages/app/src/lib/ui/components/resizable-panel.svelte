<script lang="ts">
    import type {Snippet} from 'svelte';

    interface Props {
        freeSide: 'left' | 'right';
        defaultSize: number;
        onWidthChange: (width: number) => void;
        children: Snippet;
        class?: string;
        minWidth: number;
        maxWidth: number;
        resizerClass?: string;
    }

    let {
        freeSide,
        defaultSize,
        onWidthChange,
        children,
        minWidth,
        maxWidth,
        class: className,
        resizerClass = 'w-1 cursor-col-resize hover:bg-divider-object hover:dark:bg-divider-object',
    }: Props = $props();

    let width = $state(defaultSize);
    let isResizing = $state(false);
    let startX = 0;
    let startWidth = 0;

    function handlePointerDown(e: PointerEvent) {
        isResizing = true;
        startX = e.clientX;
        startWidth = width;

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: PointerEvent) {
        if (!isResizing) return;

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
    style={`width: ${width}px;`}
>
    {@render children()}

    <div
        class={`resizer z-50 ${resizerClass}`}
        class:select-none={isResizing}
        style="position: absolute; {freeSide}: 0; top: 0; bottom: 0;"
        onpointerdown={handlePointerDown}
        onpointermove={handlePointerMove}
        onpointerup={handlePointerUp}
        onpointercancel={handlePointerUp}
    ></div>
</div>
