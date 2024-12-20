<script lang="ts">
	import BoardsList from '../components/boards/BoardsList.svelte';
	import PlusCircle from '../components/icons/PlusCircle.svelte';
	import NavigationStack from '../components/mobile/NavigationStack.svelte';
	import navigator from '../lib/navigator.js';

	const onNewBoard = () => {
		navigator.navigate('/boards/new', {
			updateBrowserURL: true,
			updateState: true
		});
	};
</script>

{#snippet trailing()}
	<button onclick={onNewBoard} class="btn btn--link btn--icon text-2xl">
		<PlusCircle />
	</button>
{/snippet}

<NavigationStack navigationTitle="Boards" {trailing}>
	<input class="input my-2" placeholder="Search" />
	<BoardsList />
</NavigationStack>
