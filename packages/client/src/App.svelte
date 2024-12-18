<script lang="ts">
	import Home from './pages/Home.svelte';
	import navigator from './lib/navigator.js';

	let Page: any = $state(Home);
	let params: any = $state({});

	$effect(() => {
		navigator.on('/', () => (Page = Home)).listen();
	});
</script>

<main>
	<Page {...params} />
</main>
