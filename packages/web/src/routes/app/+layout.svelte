<script lang="ts">
	import Sidebar from '$lib/components/sidebar.svelte';
	import {setSidebarOpen, toggle} from '$lib/utils.svelte.js';
	import {setContext} from 'svelte';

	let {children, data} = $props();

	const sidebarOpen = setSidebarOpen();
</script>

<main class="flex h-screen w-full">
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
