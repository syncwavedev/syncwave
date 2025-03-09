<script lang="ts">
	import {ScrollArea, type ScrollAreaType} from 'bits-ui';
	import type {Snippet} from 'svelte';

	// Define props with proper typing and bindable variables
	let {
		orientation = 'vertical',
		ref = $bindable(null),
		hasTopScroll = $bindable(false),
		hasBottomScroll = $bindable(false),
		hasLeft = $bindable(false),
		hasRight = $bindable(false),
		type = 'always',
		viewportClass,
		children,
		...restProps
	}: {
		orientation?: 'vertical' | 'horizontal' | 'both';
		ref?: HTMLDivElement | null;
		hasTopScroll?: boolean;
		hasBottomScroll?: boolean;
		hasLeft?: boolean;
		hasRight?: boolean;
		viewportClass?: string;
		children: Snippet;
		type?: ScrollAreaType;
		[key: string]: unknown;
	} = $props();

	let viewportRef: HTMLDivElement | null = $state(null);

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

	// Effect to update bindings on content or size changes
	$effect(() => {
		handleScroll();
	});
</script>

<!-- Scrollbar snippet for reusability -->
{#snippet Scrollbar({orientation}: {orientation: 'vertical' | 'horizontal'})}
	<ScrollArea.Scrollbar
		{orientation}
		class="flex min-h-2 min-w-2 touch-none transition-all duration-50 select-none"
	>
		<ScrollArea.Thumb
			class="bg-subtle-4 relative my-2 ml-2 min-h-2 min-w-2 rounded-full transition-all duration-50"
		/>
	</ScrollArea.Scrollbar>
{/snippet}

<!-- Scroll area structure -->
<ScrollArea.Root bind:ref {type} {...restProps}>
	<ScrollArea.Viewport
		bind:ref={viewportRef}
		class={viewportClass}
		onscroll={handleScroll}
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
