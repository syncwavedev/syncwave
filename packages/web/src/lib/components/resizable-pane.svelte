<script lang="ts">
	import type {Snippet} from 'svelte';
	import Error from '../../routes/+error.svelte';
	import {browser} from '$app/environment';

	interface Props {
		freeSide: 'left' | 'right';
		defaultSize: number;
		onWidthChange: (width: number) => void;
		children: Snippet;
		class: string;
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
		resizerClass = 'w-1 cursor-col-resize hover:bg-gray-300 active:bg-gray-400',
	}: Props = $props();

	let width = $state(defaultSize);
	let isResizing = false;
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
		const newWidth =
			freeSide === 'right' ? startWidth + deltaX : startWidth - deltaX;

		console;

		if (newWidth >= minWidth && newWidth <= maxWidth) {
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

<div class={`relative flex ${className}`} style={`width: ${width}px;`}>
	{@render children()}

	<div
		class={resizerClass}
		style="position: absolute; {freeSide}: 0; top: 0; bottom: 0;"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
	></div>
</div>
