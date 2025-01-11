<script lang="ts">
	import Avatar from '../Avatar.svelte';
	import ContextMenu from '../mobile/ContextMenu.svelte';
	import navigator from '../../lib/navigator.js';
	import {boards} from '../../lib/mock.js';
	import type {Board} from '../../lib/models.js';

	// TODO: Add input props for boards

	function formatDate(date: Date): string {
		const today = new Date();
		const isToday = date.toDateString() === today.toDateString();

		if (isToday) {
			return date.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: false});
		}

		const diffTime = Math.abs(today.getTime() - date.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays <= 7) {
			return date.toLocaleDateString('en-US', {weekday: 'short'});
		}

		return date.toLocaleDateString(undefined, {day: '2-digit', month: '2-digit'});
	}

	function onBoardClick(board: Board) {
		navigator.navigate(`/boards/${board.id}`, {
			updateBrowserURL: true,
			updateState: true
		});
	}
</script>

<ul class="boards-list">
	{#each boards as board}
		<ContextMenu
			title={board.name}
			options={[
				{
					label: 'Rename',
					action: () => {}
				},
				{
					label: 'Duplicate',
					action: () => {}
				},
				{
					label: 'Delete',
					action: () => {}
				}
			]}
		>
			<li>
				<div
					class="board-item py-2"
					role="button"
					tabindex="0"
					onclick={() => onBoardClick(board)}
					onkeydown={e => e.key === 'Enter' && onBoardClick(board)}
				>
					<div class="board-avatar mr-2">
						<Avatar title={board.name} imageUrl={board.avatar} />
					</div>
					<div class="flex flex-col flex-1 leading-snug">
						<div class="flex">
							<p class="text-truncate font-medium">{board.name}</p>
							<span class="flex-shrink-0 ml-auto text-xs text-secondary"
								>{formatDate(board.lastAction.date)}</span
							>
						</div>
						<p class="text-truncate text-sm">{board.lastAction.user}</p>
						<p class="text-truncate text-sm text-secondary text-truncate">
							{board.lastAction.action}
						</p>
					</div>
				</div>
			</li>
		</ContextMenu>
	{/each}
</ul>

<style>
	.boards-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.board-item {
		display: flex;
		align-items: center;
		cursor: pointer;

		padding-left: calc(env(safe-area-inset-left) + 0.875rem);
		padding-right: calc(env(safe-area-inset-right) + 0.875rem);

		&:active {
			background-color: var(--color-subtle-1);
		}
	}

	.board-avatar {
		height: 3.5rem;
		width: 3.5rem;
		font-size: 3.5rem;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;
	}
</style>
