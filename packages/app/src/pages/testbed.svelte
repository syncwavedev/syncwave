<script>
	import {flip} from 'svelte/animate';
	import {dragHandleZone} from 'syncwave-dnd';
	import {getAgent} from '../lib/agent/agent.svelte';
	import DndBoard from '../lib/components/dnd/dnd-board.svelte';
	import EditBoardDialog from '../lib/components/edit-board-dialog/edit-board-dialog.svelte';
	import EditProfileDialog from '../lib/components/edit-profile-dialog/edit-profile-dialog.svelte';
	import EllipsisIcon from '../lib/components/icons/ellipsis-icon.svelte';
	import PlusIcon from '../lib/components/icons/plus-icon.svelte';
	import SearchIcon from '../lib/components/icons/search-icon.svelte';
	import BoardColumn from '../lib/ui/boards/board-column.svelte';
	import CardDetails from '../lib/ui/boards/card-details.svelte';
	import UserIcon from '../lib/ui/components/icons/user-icon.svelte';
	import Scrollable from '../lib/ui/components/scrollable.svelte';

	const agent = getAgent();
	const boardPromise = agent.observeBoardAsync('local');
</script>

{#await boardPromise}
	Loading
{:then [board]}
	<main class="flex h-screen w-full">
		<div class="dark:bg-subtle-0 bg-subtle-1 flex min-w-0 grow flex-col">
			<div class="dark:bg-subtle-0 px-4">
				<div class="my-1 flex items-center">
					<div class="text-xs leading-none font-medium">
						{board.name}
					</div>
					{#if board.onlineMembers.length > 0}
						<div class="text-2xs text-ink-detail ml-auto">
							online: {board.onlineMembers
								.map(x => x.fullName)
								.join(', ')}
						</div>
					{/if}
					<button class="btn--icon ml-auto">
						<PlusIcon />
					</button>
					<button class="btn--icon">
						<SearchIcon />
					</button>
				</div>
			</div>

			<DndBoard
				{board}
				setCardPosition={agent.setCardPosition.bind(agent)}
				setColumnPosition={agent.setColumnPosition.bind(agent)}
			/>
		</div>
	</main>
{/await}
