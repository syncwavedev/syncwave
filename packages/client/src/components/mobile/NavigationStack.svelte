<script lang="ts">
	import type {Snippet} from 'svelte';
	import {slide, fade} from 'svelte/transition';
	import ChevronLeft from '../icons/ChevronLeft.svelte';
	import Times from '../icons/Times.svelte';

	let {
		navigationTitle,
		leading,
		trailing,
		children,
		bottomToolbar,
		searchActive = $bindable(false),
		searchText = $bindable(''),
		scrollTopOnTitleClick = false,
		backButton = false
	} = $props<{
		navigationTitle?: string;
		leading?: Snippet;
		trailing?: Snippet;
		children?: Snippet;
		bottomToolbar?: Snippet;
		searchActive?: boolean;
		searchText?: string;
		scrollTopOnTitleClick?: boolean;
		backButton?: boolean;
	}>();

	let contentElement = $state<HTMLElement | null>(null);
	let searchInput = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (searchActive) {
			searchInput?.focus();
		}
	});

	function handleTitleClick() {
		if (scrollTopOnTitleClick) {
			contentElement?.scrollTo({top: 0, behavior: 'smooth'});
		}
	}

	function onBackClick() {
		history.back();
	}

	function searchCancel() {
		searchActive = false;
		searchText = '';
	}

	const hasTopToolbar = !!(navigationTitle || leading || trailing || backButton);
</script>

<div class="navigation-stack flex flex-col">
	{#if hasTopToolbar}
		<header class="top-bar flex flex-1 align-end" class:border-b={!searchActive}>
			{#if searchActive}
				<div class="flex flex-1 gap-2 align-center pb-1">
					<input
						bind:this={searchInput}
						type="text"
						class="input"
						placeholder="Search"
						bind:value={searchText}
						in:fade={{duration: 150, delay: 50}}
					/>
					<button
						type="button"
						class="btn btn--circle"
						onclick={searchCancel}
						in:fade={{duration: 150, delay: 50}}
					>
						<Times />
					</button>
				</div>
			{:else}
				<div class="flex flex-1 align-center">
					<div class="flex flex-1 align-center gap-3 actions">
						{#if backButton}
							<button onclick={onBackClick} class="btn btn--icon">
								<ChevronLeft />
							</button>
						{/if}
						{@render leading?.()}
					</div>

					{#if navigationTitle}
						<button type="button" class="btn btn--plain font-semibold" onclick={handleTitleClick}>
							{navigationTitle}
						</button>
					{/if}

					<div class="flex flex-1 align-center justify-end gap-3 ml-auto actions">
						{@render trailing?.()}
					</div>
				</div>
			{/if}
		</header>
	{/if}

	<div
		bind:this={contentElement}
		class="content"
		class:with-bottom-bar={bottomToolbar && !searchActive}
	>
		{@render children?.()}
	</div>

	{#if bottomToolbar && !searchActive}
		<footer class="bottom-bar border-t" in:slide={{duration: 200}} out:slide={{duration: 200}}>
			{@render bottomToolbar?.()}
		</footer>
	{/if}
</div>

<style>
	:root {
		--top-bar-height: calc(env(safe-area-inset-top) + var(--btn-size) + 0.25rem);
		--bottom-bar-height: calc(max(env(safe-area-inset-bottom), 0.5rem) + var(--btn-size) + 0.25rem);
	}

	.navigation-stack {
		height: 100svh;
	}

	.top-bar {
		padding-top: env(safe-area-inset-top);
		padding-left: calc(env(safe-area-inset-left) + 0.25rem);
		padding-right: calc(env(safe-area-inset-right) + 0.25rem);

		height: var(--top-bar-height);

		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		z-index: 10;

		background-color: var(--color-subtle-1);
		overflow: hidden;
	}

	.content {
		flex: 1;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;

		padding-top: var(--top-bar-height);
		padding-bottom: env(safe-area-inset-bottom);

		background-color: var(--color-bg);

		&.with-bottom-bar {
			padding-bottom: var(--bottom-bar-height);
		}
	}

	.bottom-bar {
		padding-top: 0.25rem;
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
