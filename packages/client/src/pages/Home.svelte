<script lang="ts">
	import Avatar from '../components/Avatar.svelte';
	import BoardsList from '../components/boards/BoardsList.svelte';
	import Plus from '../components/icons/Plus.svelte';
	import Search from '../components/icons/Search.svelte';
	import NavigationStack from '../components/mobile/NavigationStack.svelte';
	import navigator from '../lib/navigator.js';

	const onNewBoard = () => {
		navigator.navigate('/boards/new', {
			updateBrowserURL: true,
			updateState: true
		});
	};

	const onSearch = () => {
		navigator.navigate('/search', {
			updateBrowserURL: true,
			updateState: true
		});
	};
</script>

{#snippet leading()}
	<button onclick={onNewBoard} class="btn">
		<Avatar title="Andrei" />
	</button>
{/snippet}

{#snippet bottomToolbar()}
	<div class="flex align-center justify-between">
		<button onclick={onSearch} class="btn btn--circle">
			<Search />
		</button>
		<button onclick={onNewBoard} class="btn btn--circle">
			<Plus />
		</button>
	</div>
{/snippet}

<NavigationStack navigationTitle="Boards" {leading} {bottomToolbar} scrollTopOnTitleClick>
	<BoardsList />
</NavigationStack>
