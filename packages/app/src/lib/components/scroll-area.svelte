<script lang="ts">
    import {ScrollArea, type WithoutChild} from 'bits-ui';
    import {assert} from 'syncwave';

    type Props = WithoutChild<ScrollArea.RootProps> & {
        orientation: 'vertical' | 'horizontal' | 'both';
        draggable?: boolean;
    };

    let {
        ref = $bindable(null),
        orientation = 'vertical',
        children,
        draggable = false,
        ...restProps
    }: Props = $props();

    let viewportRef = () => {
        const result = ref?.firstElementChild;
        assert(!!result, 'Viewport not found');

        return result as HTMLElement;
    };

    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let scrollTop = 0;

    function checkAllowScrollViewDrag(node: EventTarget | null) {
        if (!(node instanceof HTMLElement)) {
            return true;
        }
        if (node.dataset.disableScrollViewDrag === 'true') {
            return false;
        }
        return checkAllowScrollViewDrag(node.parentElement);
    }

    function handlePointerDown(event: PointerEvent) {
        if (!draggable) return;
        if (
            event.target !== viewportRef() &&
            !checkAllowScrollViewDrag(event.target)
        ) {
            return;
        }

        event.preventDefault();
        startX = event.clientX;
        startY = event.clientY;
        scrollLeft = viewportRef().scrollLeft;
        scrollTop = viewportRef().scrollTop;

        viewportRef().setPointerCapture(event.pointerId);
        viewportRef().addEventListener('pointermove', handlePointerMove);
        viewportRef().addEventListener('pointerup', handlePointerUp);
        viewportRef().addEventListener('pointercancel', handlePointerUp);
    }

    function handlePointerMove(event: PointerEvent) {
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (ref) {
            (ref.firstElementChild as HTMLElement).scrollLeft = scrollLeft - dx;
            (ref.firstElementChild as HTMLElement).scrollTop = scrollTop - dy;
        }
    }

    function handlePointerUp(event: PointerEvent) {
        viewportRef().releasePointerCapture(event.pointerId);
        viewportRef().removeEventListener('pointermove', handlePointerMove);
        viewportRef().removeEventListener('pointerup', handlePointerUp);
        viewportRef().removeEventListener('pointercancel', handlePointerUp);
    }
</script>

<ScrollArea.Root bind:ref {...restProps}>
    <ScrollArea.Viewport
        onpointerdown={handlePointerDown}
        class={restProps.class}
    >
        {@render children?.()}
    </ScrollArea.Viewport>
    {#if orientation === 'vertical' || orientation === 'both'}
        <ScrollArea.Scrollbar
            orientation="vertical"
            class="hover:bg-dark-10 data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out-0 data-[state=visible]:fade-in-0 flex w-2.5 touch-none rounded-full border-l border-l-transparent p-px transition-all duration-200 select-none hover:w-3"
        >
            <ScrollArea.Thumb
                class="flex-1 rounded-full bg-gray-200 hover:bg-gray-500"
            />
        </ScrollArea.Scrollbar>
    {/if}
    {#if orientation === 'horizontal' || orientation === 'both'}
        <ScrollArea.Scrollbar
            orientation="horizontal"
            class="hover:bg-dark-10 flex h-2.5 touch-none rounded-full border-t border-t-transparent p-px transition-all duration-200 select-none hover:h-3 "
        >
            <ScrollArea.Thumb
                class="rounded-full bg-gray-200 hover:bg-gray-500"
            />
        </ScrollArea.Scrollbar>
    {/if}
    <ScrollArea.Corner />
    <ScrollArea.Corner />
</ScrollArea.Root>
