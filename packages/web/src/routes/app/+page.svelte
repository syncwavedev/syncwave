<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import {getAuthManager, getSdk} from '$lib/utils';

	const auth = getAuthManager();
	const idInfo = auth.getIdentityInfo();

	const sdk = getSdk();

	let cancelled = false;

	$effect(() => {
		(async () => {
			try {
				console.log('stream start');
				for await (const item of sdk.coordinatorRpc.getStream({intervalMs: 1000})) {
					console.log('stream item', item.index);

					if (cancelled) {
						break;
					}
				}
			} finally {
				console.log('stream end');
			}
		})();
	});
</script>

{#if idInfo}
	<div>
		<Button onclick={() => auth.logOut()}>Log out</Button>
	</div>
	User: {idInfo.userId}
{:else}
	<Button href="/log-in">Log in</Button>
{/if}

<Button onclick={() => (cancelled = true)}>Stop stream</Button>
