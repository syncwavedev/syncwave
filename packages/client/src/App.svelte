<script lang="ts">
	import Home from './pages/Home.svelte';
	import NewBoard from './pages/NewBoard.svelte';
	import navigator from './lib/navigator.js';

	let Page: any = $state(Home);
	let params: any = $state({});

	$effect(() => {
		navigator.on('/', () => {
			Page = Home;
		});
		navigator.on('/boards/new', () => {
			Page = NewBoard;
		});
		navigator.resolve();
	});
</script>

<main>
	<Page {...params} />
</main>
