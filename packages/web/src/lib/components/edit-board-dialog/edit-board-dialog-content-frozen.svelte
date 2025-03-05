<script lang="ts">
	import {type BoardViewDto} from 'syncwave-data';
	import EditBoardDialogFrozenMain from './edit-board-dialog-main-frozen.svelte';
	import EditBoardDialogFrozenColumns from './edit-board-dialog-columns-frozen.svelte';
	import EditBoardDialogFrozenMembers from './edit-board-dialog-members-frozen.svelte';
	import {observeAsync, usePageState} from '$lib/utils.svelte';

	interface Props {
		board: BoardViewDto;
		onClose: () => void;
	}

	let {board, onClose}: Props = $props();

	type Route = 'main' | 'members' | 'columns';

	let route = usePageState<Route>('board-settings-route', 'main');

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
