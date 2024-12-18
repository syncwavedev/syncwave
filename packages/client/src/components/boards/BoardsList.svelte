<script lang="ts">
				// TODO: Add input props for boards

	interface Board {
		id: number;
		name: string;
		avatar: string;
	}

	let boards: Board[] = [
		{ id: 1, name: 'Ground Dev', avatar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Telegram_2019_Logo.svg/1200px-Telegram_2019_Logo.svg.png' },
		{ id: 2, name: 'Personal', avatar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Telegram_2019_Logo.svg/1200px-Telegram_2019_Logo.svg.png' },
		{ id: 3, name: 'Ground Product', avatar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Telegram_2019_Logo.svg/1200px-Telegram_2019_Logo.svg.png' }
	];
</script>

<ul class="boards-list">
	{#each boards as board}
		<li class="board-item">
			<div class="board-avatar mr-3">
				<img src={board.avatar} alt={board.name} />
			</div>
			<div class="board-details">
				<h3 class="font-medium">{board.name}</h3>
				<p class="text-sm text-secondary mt-1">3 in progress, 5 in review, 100 in done</p>
			</div>
		</li>
	{/each}
</ul>

<style>
	.boards-list {
		list-style: none;
		margin: 0;
		padding: 0.5rem 0;
	}

	.board-item {
		display: flex;
		align-items: center;
		cursor: pointer;
	}

	.board-avatar {
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 50%;
		overflow: hidden;
	}

	.board-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.board-details {
		flex: 1;
		height: 4.5rem; /* This is to make the board-item the same height as the avatar */
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--color-subtle-light);
	}
</style>
