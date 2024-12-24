<script lang="ts">
	import Avatar from '../Avatar.svelte';

	// TODO: Add input props for boards

	interface Board {
		id: number;
		name: string;
		avatar?: string;
		lastAction: {
			user: string;
			action: string;
			date: Date;
		};
	}

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

	let boards: Board[] = [
		{
			id: 1,
			name: 'Ground Dev',
			lastAction: {
				user: 'John',
				action: 'Created new task',
				date: new Date('2024-01-15')
			}
		},
		{
			id: 2,
			name: 'Personal',
			avatar:
				'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Telegram_2019_Logo.svg/1200px-Telegram_2019_Logo.svg.png',
			lastAction: {
				user: 'Sarah',
				action: 'Commented on task',
				date: new Date('2024-12-16')
			}
		},
		{
			id: 3,
			name: 'Product Design',
			lastAction: {
				user: 'Mike',
				action: 'Completed task',
				date: new Date('2024-12-19')
			}
		},
		{
			id: 4,
			name: 'Marketing Strategy',
			lastAction: {
				user: 'Emma',
				action: 'Updated timeline',
				date: new Date('2024-12-18')
			}
		},
		{
			id: 5,
			name: 'Website Redesign',
			lastAction: {
				user: 'Oliver',
				action: 'Added new milestone',
				date: new Date('2024-12-17')
			}
		},
		{
			id: 6,
			name: 'Mobile App Dev',
			lastAction: {
				user: 'Sophia',
				action: 'Merged pull request',
				date: new Date('2024-12-20')
			}
		},
		{
			id: 7,
			name: 'Content Calendar',
			lastAction: {
				user: 'Lucas',
				action: 'Scheduled post',
				date: new Date('2024-12-15')
			}
		},
		{
			id: 8,
			name: 'User Research',
			lastAction: {
				user: 'Ava',
				action: 'Added survey results',
				date: new Date('2024-12-19')
			}
		},
		{
			id: 9,
			name: 'Sales Pipeline',
			lastAction: {
				user: 'William',
				action: 'Updated leads',
				date: new Date('2024-12-16')
			}
		},
		{
			id: 10,
			name: 'HR Planning',
			lastAction: {
				user: 'Isabella',
				action: 'Posted new position',
				date: new Date('2024-12-17')
			}
		},
		{
			id: 11,
			name: 'Budget Analysis',
			lastAction: {
				user: 'James',
				action: 'Updated Q1 forecast',
				date: new Date('2024-12-18')
			}
		},
		{
			id: 12,
			name: 'Social Media',
			lastAction: {
				user: 'Charlotte',
				action: 'Created campaign',
				date: new Date('2024-12-20')
			}
		},
		{
			id: 13,
			name: 'Customer Support',
			lastAction: {
				user: 'Benjamin',
				action: 'Resolved ticket',
				date: new Date('2024-12-15')
			}
		},
		{
			id: 14,
			name: 'Quality Assurance',
			lastAction: {
				user: 'Mia',
				action: 'Completed testing',
				date: new Date('2024-12-19')
			}
		},
		{
			id: 15,
			name: 'Infrastructure',
			lastAction: {
				user: 'Ethan',
				action: 'Deployed update',
				date: new Date('2024-12-16')
			}
		},
		{
			id: 16,
			name: 'Legal Review',
			lastAction: {
				user: 'Amelia',
				action: 'Updated documents',
				date: new Date('2024-12-17')
			}
		},
		{
			id: 17,
			name: 'Partner Relations',
			lastAction: {
				user: 'Alexander',
				action: 'Scheduled meeting',
				date: new Date('2024-12-18')
			}
		},
		{
			id: 18,
			name: 'Event Planning',
			lastAction: {
				user: 'Harper',
				action: 'Booked venue',
				date: new Date('2024-12-20')
			}
		}
	];
</script>

<ul class="boards-list">
	{#each boards as board}
		<li class="board-item">
			<div class="board-avatar mr-2">
				<Avatar title={board.name} imageUrl={board.avatar} />
			</div>
			<div class="board-details">
				<div class="flex">
					<p class="font-medium">{board.name}</p>
					<span class="ml-auto text-xs text-secondary">{formatDate(board.lastAction.date)}</span>
				</div>
				<p class="text-sm leading-tight">{board.lastAction.user}</p>
				<p class="text-sm text-secondary text-truncate leading-tight">{board.lastAction.action}</p>
			</div>
		</li>
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
		margin-bottom: 0.25rem;
	}

	.board-avatar {
		font-size: 3.5rem;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;
	}

	.board-details {
		flex: 1;
		min-width: 0; /* This is to make the text truncate */
		height: 4.5rem; /* This is to make the board-item the same height as the avatar */
		padding: 0.5rem 0;
	}
</style>
