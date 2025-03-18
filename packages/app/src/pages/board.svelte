<script lang="ts">
	import {getAgent} from '../lib/agent/agent.svelte';
	import BoardScreen from '../lib/ui/boards/board-screen.svelte';
	import {getAuthManager} from '../lib/utils';

	const {key}: {key: string} = $props();

	const agent = getAgent();
	const authManager = getAuthManager();
	const userId = authManager.getIdentityInfo()?.userId;
	if (!userId) {
		console.log(
			'authManager.getIdentityInfo',
			authManager.getIdentityInfo()
		);
		throw new Error('User ID not found');
	}
</script>

{#await Promise.all( [agent.observeBoardAsync(key), agent.observeProfileAsync(userId)] )}
	<!-- promise is pending -->
	<p>waiting for the promise to resolve...</p>
{:then [[board, awareness], me]}
	<BoardScreen {board} {awareness} {me} />
{/await}
