<script lang="ts">
	import {goto} from '$app/navigation';
	import {getAuthManager} from '$lib/utils';

	const auth = getAuthManager();
	$effect(() => {
		if (auth.authorized) {
			goto('/app');
		}
	});
</script>

<a href="/auth/log-in">Sign in</a>
