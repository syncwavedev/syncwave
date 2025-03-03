<script lang="ts">
	import {type BoardViewDto} from 'syncwave-data';
	import EditBoardDialogFrozenMain from './edit-board-dialog-main-frozen.svelte';
	import EditBoardDialogFrozenColumns from './edit-board-dialog-columns-frozen.svelte';
	import EditBoardDialogFrozenMembers from './edit-board-dialog-members-frozen.svelte';
	import {observeAsync} from '$lib/utils.svelte';

	interface Props {
		board: BoardViewDto;
		onClose: () => void;
	}

	let {board, onClose}: Props = $props();

	type Route = 'main' | 'members' | 'columns';

	let route: Route = $state('main');

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
