<script lang="ts">
	import AddBoardDialog from '$lib/components/add-board-dialog.svelte';
	import {getAuthManager} from '$lib/utils';
	import {toggle} from '$lib/utils.svelte';

	const auth = getAuthManager();
	const idInfo = auth.getIdentityInfo();

	const addBoardDialogToggle = toggle();
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

<button onclick={addBoardDialogToggle.toggle} class="btn--block">
	Add board
</button>

<AddBoardDialog
	open={addBoardDialogToggle.value}
	onClose={addBoardDialogToggle.off}
/>
