<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import {Plus} from 'lucide-svelte';
	import {Button} from './ui/button';
	import {getSdk} from '$lib/utils';
	import {createBoardId} from 'ground-data';
	import {goto} from '$app/navigation';

	const sdk = getSdk();

	async function createBoard() {
		const boardId = createBoardId();
		const board = await sdk(rpc =>
			rpc.createBoard({
				boardId,
				name: 'Untitled',
				slug: boardId,
			})
		);

		goto(`/app/b/${board.id}`);
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<Sidebar.MenuButton
			onclick={createBoard}
			size="lg"
			class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
		>
			{#snippet child({props}: any)}
				<div href="/" {...props}>
					<Button class="h-8 w-8 shrink-0" variant="ghost" size="icon">
						<Plus />
					</Button>

					<div class="min-w-0">
						<div class="flex justify-between">
							<div class="truncate">New board</div>
						</div>
					</div>
				</div>
			{/snippet}
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
</Sidebar.Menu>
