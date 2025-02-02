<script lang="ts">
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	let {
		items,
	}: {
		items: {
			title: string;
			url: string;
			// this should be `Component` after lucide-svelte updates types
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			icon?: any;
			isActive?: boolean;
		}[];
	} = $props();
</script>

<Sidebar.Menu>
	{#each items as mainItem (mainItem.title)}
		<Collapsible.Root open={mainItem.isActive} class="group/collapsible">
			{#snippet child({props})}
				<Sidebar.MenuItem {...props}>
					<Sidebar.MenuButton {...props}>
						{#snippet tooltipContent()}
							{mainItem.title}
						{/snippet}
						{#if mainItem.icon}
							<mainItem.icon />
						{/if}
						<span>{mainItem.title}</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/snippet}
		</Collapsible.Root>
	{/each}
</Sidebar.Menu>
