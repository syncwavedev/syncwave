<script lang="ts">
	import Home from './pages/Home.svelte';
	import NewBoard from './pages/NewBoard.svelte';
	import navigator from './lib/navigator.js';
	import Search from './pages/Search.svelte';

	let Page: any = $state(Home);
	let params: any = $state({});

	$effect(() => {
		navigator.on('/', () => {
			Page = Home;
		});
		navigator.on('/boards/new', () => {
			Page = NewBoard;
		});
		navigator.on('/search', () => {
			Page = Search;
		});
		navigator.resolve();
	});

	// hide keyboard whenever user taps outside of an input or tries to scroll
	// this is a workaround for iOS Safari, which doesn't hide the keyboard on scroll
	// and breaks the layout when the keyboard is open
	$effect(() => {
		const hideKeyboard = () => {
			const input = document.activeElement as HTMLElement;
			if (input?.matches('input, textarea')) input.blur();
			(navigator as any).virtualKeyboard?.hide();
		};

		const handleEvent = (e: TouchEvent | MouseEvent) => {
			const isInput = (e.target as HTMLElement).matches('input, textarea');
			if (!isInput || e.type === 'touchmove') hideKeyboard();
		};

		document.addEventListener('touchstart', handleEvent);
		document.addEventListener('touchmove', handleEvent);
		document.addEventListener('focusout', hideKeyboard);

		return () => {
			document.removeEventListener('touchstart', handleEvent);
			document.removeEventListener('touchmove', handleEvent);
			document.removeEventListener('focusout', hideKeyboard);
		};
	});
</script>

<main>
	<Page {...params} />
</main>

<style>
	main {
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		position: relative;
	}
</style>
