<script lang="ts">
	import {getAuthManager} from '$lib/utils';

	const auth = getAuthManager();
	const idInfo = auth.getIdentityInfo();
</script>

<header
	class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
>
	<div class="flex items-center gap-2 px-4">SyncWave board</div>
</header>
<div class="p-4">
	{#if idInfo}
		<div>
			<button onclick={() => auth.logOut()}>Log out</button>
		</div>
		User: {idInfo.userId}
	{:else}
		<a href="/auth/log-in">Log in</a>
	{/if}
</div>
