<script lang="ts">
	import type {Snippet} from 'svelte';
	import ChevronLeft from '../icons/ChevronLeft.svelte';

	let {
		navigationTitle,
		leading,
		trailing,
		children,
		bottomToolbar,
		scrollTopOnTitleClick = false,
		backButton = false
	} = $props<{
		navigationTitle?: string;
		leading?: Snippet;
		trailing?: Snippet;
		children?: Snippet;
		bottomToolbar?: Snippet;
		scrollTopOnTitleClick?: boolean;
		backButton?: boolean;
	}>();

	let contentElement = $state<HTMLElement | null>(null);

	function handleTitleClick() {
		if (scrollTopOnTitleClick) {
			contentElement?.scrollTo({top: 0, behavior: 'smooth'});
		}
	}

	function onBackClick() {
		history.back();
	}

	const hasTopToolbar = !!(navigationTitle || leading || trailing || backButton);
</script>

<div class="navigation-stack flex flex-col">
	{#if hasTopToolbar}
		<header class="flex align-end top-bar">
			<div class="flex align-center gap-3">
				{#if backButton}
					<button onclick={onBackClick} class="btn btn--circle">
						<ChevronLeft />
					</button>
				{/if}
				{@render leading?.()}
			</div>

			{#if navigationTitle}
				<button
					type="button"
					class="top-bar__toolbar__title font-semibold"
					onclick={handleTitleClick}
				>
					{navigationTitle}
				</button>
			{/if}

			<div class="flex align-center justify-end gap-3 ml-auto">
				{@render trailing?.()}
			</div>
		</header>
	{/if}

	<main bind:this={contentElement} class="content" class:with-bottom-bar={bottomToolbar}>
		{@render children?.()}
	</main>

	{#if bottomToolbar}
		<footer class="bottom-bar">
			{@render bottomToolbar?.()}
		</footer>
	{/if}
</div>

<style>
	:root {
		--top-bar-height: calc(max(env(safe-area-inset-top), 0.5rem) + 2rem + 0.5rem);
		--bottom-bar-height: calc(max(env(safe-area-inset-bottom), 0.5rem) + var(--btn-size) + 0.5rem);
	}

	.navigation-stack {
		height: 100svh;
	}

	.top-bar {
		--btn-size: 1.75rem;

		padding-top: max(env(safe-area-inset-top), 0.5rem);
		padding-left: calc(env(safe-area-inset-left) + 1rem);
		padding-right: calc(env(safe-area-inset-right) + 1rem);
		padding-bottom: 0.5rem;

		height: var(--top-bar-height);

		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		z-index: 10;

		background-color: var(--color-subtle-1);
	}

	.top-bar__toolbar__title {
		text-align: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
	}

	.content {
		flex: 1;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;

		padding-top: var(--top-bar-height);
		padding-bottom: env(safe-area-inset-bottom);
		padding-left: calc(env(safe-area-inset-left) + 0.75rem);
		padding-right: calc(env(safe-area-inset-right) + 0.75rem);

		background-color: var(--color-bg);

		&.with-bottom-bar {
			padding-bottom: var(--bottom-bar-height);
		}
	}

	.bottom-bar {
		padding-top: 0.5rem;
		padding-left: calc(env(safe-area-inset-left) + 1rem);
		padding-right: calc(env(safe-area-inset-right) + 1rem);
		padding-bottom: max(env(safe-area-inset-bottom), 0.5rem);

		height: var(--bottom-bar-height);

		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 10;

		background-color: var(--color-subtle-1);
	}
</style>
