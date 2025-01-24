<script lang="ts">
	import * as ContextMenu from '$lib/components/ui/context-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';

	let {
		boards,
	}: {
		boards: {
			name: string;
			description: string;
			url: string;
			avatar?: string;
			time: string;
		}[];
	} = $props();

	function generateAvatar(name: string): {avatar: string; color: string} {
		if (!name) return {avatar: '', color: '#000000'};

		// Split the name by spaces and filter out empty strings
		const words = name
			.split(' ')
			.map(word => word.replace(/[^a-zA-Z]/g, ''))
			.filter(word => word.length > 0);

		// Generate the avatar
		const avatar =
			words.length > 1
				? words[0][0].toUpperCase() + words[1][0].toUpperCase()
				: words[0][0].toUpperCase();

		const colors = [
			'#e66651',
			'#f68c3e',
			'#8f83f3',
			'#74cb46',
			'#76c9de',
			'#519be2',
			'#f47298',
			'#80d066',
		];

		// Hash function to consistently select a color
		const hash = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);

		// Use the hash to pick a color from the array
		const color = colors[hash % colors.length];

		return {avatar, color};
	}
</script>

<Sidebar.Menu>
	{#each boards as item, idx (item.name)}
		<ContextMenu.Root>
			<ContextMenu.Trigger>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
					>
						{#snippet child({props}: any)}
							{@const {avatar, color} = generateAvatar(item.name)}

							<a href={item.url} {...props}>
								<Avatar.Root class="h-8 w-8 rounded-lg">
									{#if item.avatar}
										<Avatar.Image src={item.avatar} alt={item.name} />
									{/if}
									<Avatar.Fallback
										class="rounded-lg"
										style={{backgroundColor: color}}
									>
										{avatar}
									</Avatar.Fallback>
								</Avatar.Root>

								<div class="min-w-0">
									<div class="flex justify-between">
										<div class="truncate font-semibold">
											{item.name}
										</div>

										<div class="text-xs">
											{item.time}
										</div>
									</div>
									<div class="max-w-full truncate text-ellipsis text-xs">
										{item.description}
									</div>
								</div>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</ContextMenu.Trigger>
			<ContextMenu.Content class="w-64">
				<ContextMenu.Item inset>
					Back
					<ContextMenu.Shortcut>⌘[</ContextMenu.Shortcut>
				</ContextMenu.Item>
				<ContextMenu.Item inset>
					Forward
					<ContextMenu.Shortcut>⌘]</ContextMenu.Shortcut>
				</ContextMenu.Item>
				<ContextMenu.Item inset>
					Reload
					<ContextMenu.Shortcut>⌘R</ContextMenu.Shortcut>
				</ContextMenu.Item>
				<ContextMenu.Sub>
					<ContextMenu.SubTrigger inset>More Tools</ContextMenu.SubTrigger>
					<ContextMenu.SubContent class="w-48">
						<ContextMenu.Item>
							Save Page As...
							<ContextMenu.Shortcut>⇧⌘S</ContextMenu.Shortcut>
						</ContextMenu.Item>
						<ContextMenu.Item>Create Shortcut...</ContextMenu.Item>
						<ContextMenu.Item>Name Window...</ContextMenu.Item>
						<ContextMenu.Separator />
						<ContextMenu.Item>Developer Tools</ContextMenu.Item>
					</ContextMenu.SubContent>
				</ContextMenu.Sub>
				<ContextMenu.Separator />
				<ContextMenu.CheckboxItem>
					Show Bookmarks Bar
					<ContextMenu.Shortcut>⌘⇧B</ContextMenu.Shortcut>
				</ContextMenu.CheckboxItem>
				<ContextMenu.CheckboxItem>Show Full URLs</ContextMenu.CheckboxItem>
				<ContextMenu.Separator />
				<ContextMenu.RadioGroup>
					<ContextMenu.Group>
						<ContextMenu.GroupHeading inset>People</ContextMenu.GroupHeading>
						<ContextMenu.Separator />
						<ContextMenu.RadioItem value="pedro">Pedro Duarte</ContextMenu.RadioItem>
						<ContextMenu.RadioItem value="colm">Colm Tuite</ContextMenu.RadioItem>
					</ContextMenu.Group>
				</ContextMenu.RadioGroup>
			</ContextMenu.Content>
		</ContextMenu.Root>
	{/each}
</Sidebar.Menu>
