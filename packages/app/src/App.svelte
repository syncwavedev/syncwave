<script lang="ts">
	import LoginScreen from './lib/ui/login/login-screen.svelte';

	// let Page: any = $state(Home);
	// let params: any = $state({});

	// $effect(() => {
	// 	navigator.on('/', () => {
	// 		Page = Home;
	// 	});
	// 	navigator.on('/boards/new', () => {
	// 		Page = NewBoard;
	// 	});
	// 	navigator.on('/boards/:id', () => {
	// 		Page = Board;
	// 	});
	// 	navigator.resolve();
	// });
</script>

<main>
	<LoginScreen />
	<!-- <Page {...params} /> -->
</main>
