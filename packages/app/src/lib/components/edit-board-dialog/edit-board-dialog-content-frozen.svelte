<script lang="ts">
	import EditBoardDialogFrozenMain from './edit-board-dialog-main-frozen.svelte';
	import EditBoardDialogFrozenColumns from './edit-board-dialog-columns-frozen.svelte';
	import EditBoardDialogFrozenMembers from './edit-board-dialog-members-frozen.svelte';
	import {observeAsync, usePageState} from '$lib/utils.svelte';
	import type {BoardTreeView} from '$lib/agent/view.svelte';

	interface Props {
		board: BoardTreeView;
		onClose: () => void;
	}

	let {board, onClose}: Props = $props();

	type Route = 'main' | 'members' | 'columns';

	let route = usePageState<Route>('main');

	const membersPromise = observeAsync(x =>
		x.getBoardMembers({boardId: board.id})
	);
</script>

{#if route.value === 'main'}
	<EditBoardDialogFrozenMain
		onColumns={() => route.push('columns')}
		onMembers={() => route.push('members')}
		{board}
		{onClose}
	/>
{/if}

{#if route.value === 'members'}
	{#await membersPromise}
		Loading...
	{:then members}
		<EditBoardDialogFrozenMembers
			boardId={board.id}
			members={members.value}
			onBack={route.pop}
			{onClose}
		/>
	{/await}
{/if}

{#if route.value === 'columns'}
	<EditBoardDialogFrozenColumns {board} onBack={route.pop} {onClose} />
{/if}
