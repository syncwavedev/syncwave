<script lang="ts">
	import AppSidebar from './app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	let {children, data} = $props();
</script>

<Sidebar.Provider>
	<AppSidebar
		initialMe={data.initialMe}
		initialMyMembers={data.initialMyMembers}
	/>
	<Sidebar.Inset>
		{@render children()}
	</Sidebar.Inset>
</Sidebar.Provider>
