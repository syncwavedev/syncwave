<script lang="ts">
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Tabs from '$lib/components/ui/tabs/index.js';

	let source: 'client' | 'server' = $state('server');

	interface Item {
		name: string;
		children: Item[];
	}
	const items: Item[] = [
		{
			name: 'root',
			children: [
				{
					name: 'topics',
					children: [
						{
							name: 'users',
							children: [
								{name: '1', children: []},
								{name: '2', children: []},
								{name: '3', children: []},
								{name: '4', children: []},
								{name: '5', children: []},
								{name: '6', children: []},
								{name: '7', children: []},
								{name: '8', children: []},
								{name: '9', children: []},
								{name: '10', children: []},
							],
						},
						{
							name: 'posts',
							children: [
								{name: 'post1', children: []},
								{name: 'post2', children: []},
								{name: 'post3', children: []},
								{name: 'post4', children: []},
								{name: 'post5', children: []},
							],
						},
						{
							name: 'categories',
							children: [
								{
									name: 'category1',
									children: [
										{name: 'subcat1', children: []},
										{name: 'subcat2', children: []},
									],
								},
								{
									name: 'category2',
									children: [
										{name: 'subcat3', children: []},
										{name: 'subcat4', children: []},
									],
								},
							],
						},
					],
				},
				{
					name: 'settings',
					children: [
						{name: 'preferences', children: []},
						{name: 'themes', children: []},
						{name: 'notifications', children: []},
					],
				},
				{
					name: 'help',
					children: [
						{name: 'faq', children: []},
						{name: 'support', children: []},
					],
				},
			],
		},
	];
</script>

<div>
	<div class="text-2xl font-semibold">Store</div>
	<Tabs.Root class="w-[400px]" bind:value={source}>
		<Tabs.List>
			<Tabs.Trigger value="client">Client</Tabs.Trigger>
			<Tabs.Trigger value="server">Server</Tabs.Trigger>
		</Tabs.List>
	</Tabs.Root>

	{#snippet itemView(item: Item)}
		<Collapsible.Root open>
			<Collapsible.Trigger>{item.name}</Collapsible.Trigger>
			<Collapsible.Content>
				<div class="border-l pl-4">
					{#each item.children as child}
						{@render itemView(child)}
					{/each}
				</div>
			</Collapsible.Content>
		</Collapsible.Root>
	{/snippet}
	{#each items as item}
		{@render itemView(item)}
	{/each}
</div>
