<script lang="ts">
	import {goto} from '$app/navigation';
	import Button from '$lib/components/ui/button/button.svelte';
	import {getAuthManager} from '$lib/utils';

	const auth = getAuthManager();
	$effect(() => {
		if (auth.authorized) {
			goto('/app');
		}
	});
</script>

<Button href="/auth/log-in">Sign in</Button>
