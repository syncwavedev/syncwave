<script lang="ts">
	import Sidebar from '$lib/components/sidebar.svelte';
	import {setSidebarOpen, toggle} from '$lib/utils.svelte.js';
	import {setContext} from 'svelte';

	let {children, data} = $props();

	const sidebarOpen = setSidebarOpen();
</script>

<main class="flex h-screen w-full">
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

	{#if sidebarOpen.value}
		<div class="border-default flex w-64 shrink-0 flex-col border-r px-2">
			<Sidebar
				ontoggle={sidebarOpen.toggle}
				initialMe={data.initialMe}
				initialMyMembers={data.initialMyMembers}
			/>
		</div>
	{/if}
	<div class="flex min-h-0 min-w-0 flex-1 flex-col">
		{@render children()}
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
