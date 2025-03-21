<script lang="ts">
	import {ScrollArea, type ScrollAreaType} from 'bits-ui';
	import type {Snippet} from 'svelte';

	// Define props with proper typing and bindable variables
	let {
		orientation = 'vertical',
		ref = $bindable(null),
		viewportRef = $bindable(null),
		hasTopScroll = $bindable(false),
		hasBottomScroll = $bindable(false),
		hasLeft = $bindable(false),
		hasRight = $bindable(false),
		type = 'always',
		viewportClass,
		draggable,
		children,
		...restProps
	}: {
		orientation?: 'vertical' | 'horizontal' | 'both';
		ref?: HTMLDivElement | null;
		viewportRef?: HTMLDivElement | null;
		hasTopScroll?: boolean;
		hasBottomScroll?: boolean;
		hasLeft?: boolean;
		hasRight?: boolean;
		viewportClass?: string;
		children: Snippet;
		type?: ScrollAreaType;
		draggable?: boolean;
		[key: string]: unknown;
	} = $props();

	// Handle scroll updates for all orientations
	function handleScroll() {
		if (!viewportRef) return;

		if (orientation === 'vertical' || orientation === 'both') {
			hasTopScroll = viewportRef.scrollTop > 0;
			hasBottomScroll =
				viewportRef.scrollTop + viewportRef.clientHeight <
				viewportRef.scrollHeight;
		}

		// Update horizontal bindings for 'horizontal' or 'both'
		if (orientation === 'horizontal' || orientation === 'both') {
			hasLeft = viewportRef.scrollLeft > 0;
			hasRight =
				viewportRef.scrollLeft + viewportRef.clientWidth <
				viewportRef.scrollWidth;
		}
	}

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
		if (!draggable || !viewportRef) return;
		if (
			event.target !== viewportRef &&
			!checkAllowScrollViewDrag(event.target)
		) {
			return;
		}

		event.preventDefault();
		startX = event.clientX;
		startY = event.clientY;
		scrollLeft = viewportRef.scrollLeft;
		scrollTop = viewportRef.scrollTop;

		viewportRef.setPointerCapture(event.pointerId);
		viewportRef.addEventListener('pointermove', handlePointerMove);
		viewportRef.addEventListener('pointerup', handlePointerUp);
		viewportRef.addEventListener('pointercancel', handlePointerUp);
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
		if (!viewportRef) return;

		viewportRef.releasePointerCapture(event.pointerId);
		viewportRef.removeEventListener('pointermove', handlePointerMove);
		viewportRef.removeEventListener('pointerup', handlePointerUp);
		viewportRef.removeEventListener('pointercancel', handlePointerUp);
	}

	// Effect to update bindings on content or size changes
	$effect(() => {
		handleScroll();
	});
</script>

{#snippet Scrollbar({orientation}: {orientation: 'vertical' | 'horizontal'})}
	<ScrollArea.Scrollbar
		forceMount
		{orientation}
		class="flex min-h-3 min-w-2 touch-none transition-all duration-100 select-none data-[state=hidden]:opacity-0 data-[state=visible]:opacity-100"
	>
		<ScrollArea.Thumb
			class="bg-scrollbar relative rounded-full transition-all duration-50 {orientation ===
			'vertical'
				? 'h-full min-w-1.75'
				: 'mb-1.25 h-1.5'}"
		/>
	</ScrollArea.Scrollbar>
{/snippet}

<ScrollArea.Root bind:ref scrollHideDelay={250} {type} {...restProps}>
	<ScrollArea.Viewport
		bind:ref={viewportRef}
		class={viewportClass}
		onscroll={handleScroll}
		onpointerdown={handlePointerDown}
	>
		{@render children?.()}
	</ScrollArea.Viewport>
	{#if orientation === 'horizontal' || orientation === 'both'}
		{@render Scrollbar({orientation: 'horizontal'})}
	{/if}
	{#if orientation === 'vertical' || orientation === 'both'}
		{@render Scrollbar({orientation: 'vertical'})}
	{/if}
	<ScrollArea.Corner />
</ScrollArea.Root>
