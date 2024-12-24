<script lang="ts">
	import Avatar from '../components/Avatar.svelte';
	import BoardsList from '../components/boards/BoardsList.svelte';
	import Plus from '../components/icons/Plus.svelte';
	import NavigationStack from '../components/mobile/NavigationStack.svelte';
	import navigator from '../lib/navigator.js';

	let searchActive = false;

	const activateSearch = () => {
		searchActive = true;
	};

	const deactivateSearch = () => {
		searchActive = false;
	};

	const onNewBoard = () => {
		navigator.navigate('/boards/new', {
			updateBrowserURL: true,
			updateState: true
		});
	};
</script>

{#snippet leading()}
	<!-- Show leading only when not in search mode -->
	{#if !searchActive}
		<button class="btn btn--icon text-3xl">
			<Avatar title="Andrei" />
		</button>
	{/if}
{/snippet}

{#snippet trailing()}
	<!-- Show trailing only when not in search mode -->
	{#if !searchActive}
		<button onclick={onNewBoard} class="btn btn--icon text-3xl">
			<Plus />
		</button>
	{/if}
{/snippet}

<NavigationStack
	navigationTitle={searchActive ? 'Search' : 'Boards'}
	{leading}
	{trailing}
	scrollTopOnTitleClick
>
	<!--
	  Wrap input + cancel button in a row (flex container).
	  The “Cancel” button only shows (with a fade) when searchActive is true.
	-->
	<div class="flex items-center my-2 gap-2">
		<input class="input flex-1" type="text" placeholder="Search" onclick={activateSearch} />

		{#if searchActive}
			<button class="btn text-sm" onclick={deactivateSearch}> Cancel </button>
		{/if}
	</div>

	{#if searchActive}
		<!-- Show search-related content or component -->
		<p>Search results go here...</p>
	{:else}
		<!-- Default boards list -->
		<BoardsList />
	{/if}
</NavigationStack>
