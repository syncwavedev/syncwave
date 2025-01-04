<script lang="ts">
	import {tick} from 'svelte';
	import Portal from 'svelte-portal';
	import type {Snippet} from 'svelte';
	import {impactFeedback} from '@tauri-apps/plugin-haptics';
	import {fade, scale} from 'svelte/transition';
	import {cubicOut} from 'svelte/easing';

	let {options, children, title} = $props<{
		options: Array<{
			label: string;
			icon?: Snippet;
			destructive?: boolean;
			action: () => void;
		}>;
		children?: Snippet;
		title: string;
	}>();

	let isOpen = $state(false);
	let menuRef: HTMLDivElement | null = $state(null);
	let itemRef: HTMLElement | null = null;
	let menuPos = $state({y: 0, maxHeight: 0});

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside, true);
			updateMenuPosition();
			return () => document.removeEventListener('click', handleClickOutside, true);
		}
	});

	function handleClickOutside(e: MouseEvent) {
		if (!menuRef?.contains(e.target as Node)) {
			isOpen = false;
		}
	}

	async function updateMenuPosition() {
		await tick();

		if (!menuRef || !itemRef) return;

		const menuRect = menuRef.getBoundingClientRect();
		const itemRect = itemRef.getBoundingClientRect();
		const maxMenuHeight = Math.min(menuRect.height, window.innerHeight - 40); // 20px padding top and bottom

		menuPos = {
			y: calculateOptimalYPosition(itemRect, maxMenuHeight),
			maxHeight: maxMenuHeight
		};
	}

	function calculateOptimalYPosition(itemRect: DOMRect, menuHeight: number): number {
		const VIEWPORT_PADDING = 20;
		const spaceAbove = itemRect.top;
		const spaceBelow = window.innerHeight - itemRect.bottom;

		if (spaceBelow >= menuHeight + VIEWPORT_PADDING) {
			return itemRect.top + VIEWPORT_PADDING;
		} else if (spaceAbove >= menuHeight + VIEWPORT_PADDING) {
			return itemRect.bottom - menuHeight - VIEWPORT_PADDING;
		} else {
			// If neither above nor below has enough space, center it in the available space
			return Math.max(VIEWPORT_PADDING, (window.innerHeight - menuHeight) / 2);
		}
	}

	async function handleLongPress(e: TouchEvent) {
		e.preventDefault();
		await impactFeedback('medium');
		isOpen = true;
	}

	function handleTouchStart(e: TouchEvent) {
		const longPressTimer = setTimeout(() => handleLongPress(e), 500);

		function cleanup() {
			clearTimeout(longPressTimer);
			document.removeEventListener('touchend', handleTouchEnd);
			document.removeEventListener('touchmove', handleTouchMove);
		}

		const handleTouchEnd = () => cleanup();
		const handleTouchMove = () => cleanup();

		document.addEventListener('touchend', handleTouchEnd);
		document.addEventListener('touchmove', handleTouchMove);
	}
</script>

<!-- We bind `itemRef` so we can measure its bounding box for bottom/top placement. -->
<div bind:this={itemRef} ontouchstart={handleTouchStart}>
	{@render children?.()}
</div>

{#if isOpen}
	<Portal target="body">
		<div class="context-menu__overlay" transition:fade={{duration: 150}}></div>

		<div
			bind:this={menuRef}
			class="context-menu__container"
			role="menu"
			style="
				left: 1rem;
				top: {menuPos.y}px;
			"
			transition:scale={{
				duration: 150,
				start: 0.95,
				opacity: 0,
				easing: cubicOut
			}}
		>
			<div class="context-menu__content">
				<div class="context-menu__header">
					{title}
				</div>
				{#each options as option, i}
					<button class="btn context-menu__item" onclick={() => option.action()} role="menuitem">
						{#if option.icon}
							<span class="context-menu__item-icon">{@render option.icon()}</span>
						{/if}
						<span class="context-menu__item-label">{option.label}</span>
					</button>
				{/each}
			</div>
		</div>
	</Portal>
{/if}

<style>
	.context-menu__overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.15);
		backdrop-filter: blur(8px);
		z-index: 999;
	}

	.context-menu__container {
		position: fixed;
		z-index: 1000;
		padding: 4px;
		transform-origin: top left;
	}

	.context-menu__content {
		background: var(--color-subtle-1);
		backdrop-filter: blur(20px);
		border-radius: 0.75rem;
		overflow: hidden;
		min-width: 15rem;
	}

	.context-menu__header {
		padding: 0.75rem 1rem;
		font-weight: 500;
		border-bottom: 2px solid var(--color-border);
	}

	.context-menu__item {
		display: flex;
		align-items: center;
		width: 100%;
		padding: 0.75rem 1rem;
		text-align: left;
		font-weight: 400;
		border-bottom: 1px solid var(--color-border);
		animation: slideIn 200ms var(--cubic-bezier-ios) backwards;

		&:last-child {
			border-bottom: none;
		}

		&:active {
			background: var(--color-subtle-3);
		}
	}

	.context-menu__item-icon {
		margin-right: 0.75rem;
		width: 1.25rem;
		height: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.context-menu__item-label {
		flex: 1;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
