<script lang="ts">
	import PlusIcon from '$lib/components/icons/plus-icon.svelte';
	import SearchIcon from '$lib/components/icons/search-icon.svelte';
	import Sidebar from '$lib/components/sidebar.svelte';
	import TaskTile from '$lib/components/task-tile.svelte';

	let {children, data} = $props();
</script>

<main class="flex h-screen w-full">
	<div class="border-default flex w-64 flex-col border-r px-2">
		<Sidebar
			initialMe={data.initialMe}
			initialMyMembers={data.initialMyMembers}
		/>
	</div>
	<div class="flex flex-1 flex-col px-6">
		{@render children()}
	</div>
</main>
