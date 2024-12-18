<script lang="ts">
	interface Board {
		id: number;
		name: string;
		avatar: string;
	}

	let boards: Board[] = [
		{ id: 1, name: 'Board 1', avatar: 'avatar1.png' },
		{ id: 2, name: 'Board 2', avatar: 'avatar2.png' },
		{ id: 3, name: 'Board 3', avatar: 'avatar3.png' }
	];
</script>

<div class="page-container">
	<header>
		<div class="title">Page Title</div>
		<!-- Could add icons or actions here -->
	</header>

	<main class="content">
		<div class="header">
			<h1>Boards</h1>
		</div>
		<ul class="board-list">
			{#each boards as board}
				<li class="board-item">
					<img src={board.avatar} alt={board.name} class="board-avatar" />
					<span class="board-name">{board.name}</span>
				</li>
			{/each}
		</ul>
	</main>

	<footer class="footer">
		<button>Home</button>
		<button>Search</button>
		<button>Profile</button>
	</footer>
</div>

<style>
	.board-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.board-item {
		display: flex;
		align-items: center;
		padding: 10px;
		border-bottom: 1px solid #ccc;
	}

	.board-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		margin-right: 10px;
	}

	.board-name {
		font-size: 16px;
	}
</style>
