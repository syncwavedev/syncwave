<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { getSdk } from '$lib/utils';
	import { onDestroy, setContext } from 'svelte';

	const sdk = getSdk();

	$effect(() => {
		// participant.sendSignInEmail('tilyupo@gmail.com');
		sdk.verifySignInCode(
			'tilyupo@gmail.com',
			'236550'.split('').map((x) => +x)
		).then((x) => console.log(x));
	});
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<Button>Hello</Button>

<a href="/sign-in">Sign in</a>
