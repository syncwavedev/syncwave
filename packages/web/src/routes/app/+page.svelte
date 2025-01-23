<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import {getAuthManager} from '$lib/utils';

	const auth = getAuthManager();
	const idInfo = auth.getIdentityInfo();
</script>

{#if idInfo}
	<div>
		<Button onclick={() => auth.logOut()}>Log out</Button>
	</div>
	User: {idInfo.userId}
{:else}
	<Button href="/log-in">Log in</Button>
{/if}
