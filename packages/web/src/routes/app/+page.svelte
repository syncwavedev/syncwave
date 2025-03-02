<script lang="ts">
	import AddBoardDialog from '$lib/components/add-board-dialog.svelte';
	import Dashboard from '$lib/components/dashboard.svelte';
	import Sidebar from '$lib/components/sidebar.svelte';
	import {getAuthManager} from '$lib/utils';
	import {toggle} from '$lib/utils.svelte';

	let {data} = $props();
	let {initialMyMembers} = $derived(data);

	const auth = getAuthManager();
	const idInfo = auth.getIdentityInfo();

	const addBoardDialogToggle = toggle();
</script>

<Dashboard {initialMyMembers} />

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
