<script lang="ts">
	import {getAgent} from '../lib/agent/agent.svelte';
	import boardHistoryManager from '../lib/board-history-manager';
	import BoardScreen from '../lib/ui/boards/board-screen.svelte';
	import Loading from '../lib/ui/components/loading.svelte';
	import {getAuthManager} from '../lib/utils';

	const {key}: {key: string} = $props();

	const agent = getAgent();
	const authManager = getAuthManager();
	const userId = authManager.getIdentityInfo()?.userId;
	if (!userId) {
		console.log('authManager.getIdentityInfo', authManager.getIdentityInfo());
		throw new Error('User ID not found');
	}

	boardHistoryManager.save(key);
</script>

{#await Promise.all( [agent.observeBoardAsync(key), agent.observeProfileAsync(userId)] )}
	<Loading />
{:then [[board, awareness], me]}
	<BoardScreen {board} {awareness} {me} />
{/await}
