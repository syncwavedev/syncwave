<script lang="ts">
	import Sidebar from '$lib/components/sidebar.svelte';
	import {getUniversalStore} from '$lib/utils.js';
	import {setSidebarOpen} from '$lib/utils.svelte.js';
	import ResizablePane from '$lib/components/resizable-pane.svelte';
	import ErrorCard from '$lib/components/error-card.svelte';

	let {children, data} = $props();

	const storage = getUniversalStore();

	const SIDEBAR_WIDTH_KEY = 'sbw';

	const initialSidebarWidth =
		Number.parseInt(storage.get(SIDEBAR_WIDTH_KEY) ?? '200') || 200;

	function handleSidebarWidthChange(sidebarWidth: number) {
		storage.set(SIDEBAR_WIDTH_KEY, Math.round(sidebarWidth).toString());
	}

	const sidebarOpen = setSidebarOpen();
</script>

<noscript>
	<div class="noscript-alert">
		<div class="noscript-content">
			<div class="noscript-emoji">⚠️</div>
			<h1 class="noscript-title">JavaScript Required</h1>
			<p class="noscript-message">
				This app requires JavaScript to function properly.<br />
				Please enable JavaScript in your browser settings to continue.
			</p>
		</div>
	</div>
</noscript>

<main class="bg-subtle-1 dark:bg-subtle-0 flex h-screen w-full">
	{#if sidebarOpen.value}
		<ResizablePane
			minWidth={200}
			maxWidth={400}
			freeSide="right"
			onWidthChange={handleSidebarWidthChange}
			defaultSize={initialSidebarWidth}
			class="border-default flex shrink-0 flex-col border-r px-2"
		>
			<Sidebar
				ontoggle={sidebarOpen.toggle}
				initialMe={data.initialMe}
				initialMyMembers={data.initialMyMembers}
			/>
		</ResizablePane>
	{/if}
	<div class="flex min-h-0 min-w-0 flex-1 flex-col">
		<svelte:boundary>
			{#snippet failed(error)}
				<!-- don't allow reset because it doesn't work for board view -->
				<ErrorCard {error} />
			{/snippet}
			{@render children()}
		</svelte:boundary>
	</div>
</main>

<style>
	.noscript-alert {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #f8f9fa;
		z-index: 9999;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		padding: 2rem;
		text-align: center;
	}
	.noscript-content {
		max-width: 600px;
		color: #343a40;
	}
	.noscript-emoji {
		font-size: 4rem;
		margin-bottom: 1rem;
	}
	.noscript-title {
		font-size: 3rem;
		margin-bottom: 1rem;
		color: #495057;
	}
	.noscript-message {
		font-size: 1.2rem;
		line-height: 1.6;
		color: #6c757d;
	}
</style>
