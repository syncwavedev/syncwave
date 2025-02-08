<script lang="ts">
	import * as ContextMenu from '$lib/components/ui/context-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import type {BoardDto} from 'syncwave-data';
	import {formatTime, getSdk} from '$lib/utils';
	import EditBoardDialog from './edit-board-dialog.svelte';
	import {toggle} from '$lib/utils.svelte';

	let {
		board,
	}: {
		board: BoardDto;
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
			words.length > 0
				? words.length > 1
					? words[0][0].toUpperCase() + words[1][0].toUpperCase()
					: words[0][0].toUpperCase()
				: '';

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
		const hash = Array.from(name).reduce(
			(acc, char) => acc + char.charCodeAt(0),
			0
		);

		// Use the hash to pick a color from the array
		const color = colors[hash % colors.length];

		return {avatar, color};
	}

	const editOpen = toggle();

	const sdk = getSdk();

	async function deleteBoard() {
		if (!confirm('Are you sure you want to delete this board?')) return;

		await sdk(rpc => rpc.deleteBoard({boardId: board.id}));
	}
</script>

<Sidebar.Menu>
	<ContextMenu.Root>
		<ContextMenu.Trigger>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					size="lg"
					class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
				>
					{#snippet child({props}: any)}
						{@const {avatar, color} = generateAvatar(board.name)}

						<a href={`/app/b/${board.key}`} {...props}>
							<Avatar.Root class="h-8 w-8 rounded-lg">
								{#if false as any}
									<Avatar.Image
										src={board.name}
										alt={board.name}
									/>
								{/if}
								<Avatar.Fallback
									class="rounded-lg"
									style={{backgroundColor: color}}
								>
									{avatar}
								</Avatar.Fallback>
							</Avatar.Root>

							<div class="w-full min-w-0">
								<div class="flex w-full justify-between">
									<div class="truncate font-semibold">
										{board.name}
									</div>

									<div class="text-xs">
										{formatTime(board.createdAt)}
									</div>
								</div>
								<div
									class="max-w-full truncate text-ellipsis text-xs"
								>
									{board.key}
								</div>
							</div>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</ContextMenu.Trigger>
		<ContextMenu.Content class="w-64">
			<ContextMenu.Item inset onclick={editOpen.toggle}>
				Edit
				<ContextMenu.Shortcut>⌘[</ContextMenu.Shortcut>
			</ContextMenu.Item>
			<ContextMenu.Item inset onclick={deleteBoard}>
				Delete
				<ContextMenu.Shortcut>⌘[</ContextMenu.Shortcut>
			</ContextMenu.Item>
		</ContextMenu.Content>
	</ContextMenu.Root>
</Sidebar.Menu>

<EditBoardDialog {board} bind:open={editOpen.value} />
