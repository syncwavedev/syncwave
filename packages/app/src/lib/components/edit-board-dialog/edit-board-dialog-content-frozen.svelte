<script lang="ts">
	import EditBoardDialogFrozenMain from './edit-board-dialog-main-frozen.svelte';
	import EditBoardDialogFrozenColumns from './edit-board-dialog-columns-frozen.svelte';
	import EditBoardDialogFrozenMembers from './edit-board-dialog-members-frozen.svelte';
	import {observeAsync} from '../../utils.svelte';
	import type {BoardTreeView} from '../../agent/view.svelte';
	import type {UserId} from 'syncwave';

	interface Props {
		board: BoardTreeView;
		meId: UserId;
		onClose: () => void;
	}

	let {board, onClose, meId}: Props = $props();

	type Route = 'main' | 'members' | 'columns';

	let route = $state<Route>('main');

	const membersPromise = observeAsync(x =>
		x.getBoardMembers({boardId: board.id})
	);
</script>

{#if route === 'main'}
	<EditBoardDialogFrozenMain
		onColumns={() => (route = 'columns')}
		onMembers={() => (route = 'members')}
		{board}
		{onClose}
	/>
{/if}

{#if route === 'members'}
	{#await membersPromise}
		Loading...
	{:then members}
		<EditBoardDialogFrozenMembers
			{meId}
			boardId={board.id}
			members={members.value}
			onBack={() => (route = 'main')}
			{onClose}
		/>
	{/await}
{/if}

{#if route === 'columns'}
	<EditBoardDialogFrozenColumns
		{board}
		onBack={() => (route = 'main')}
		{onClose}
	/>
{/if}
