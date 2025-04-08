<script lang="ts">
    import {getAgent} from '../lib/agent/agent';
    import boardHistoryManager from '../lib/board-history-manager';
    import BoardScreen from '../lib/ui/boards/board-screen.svelte';
    import Loading from '../lib/ui/components/loading.svelte';
    import {getAuthManager} from '../lib/utils';

    const {key, counter}: {key: string; counter?: string} = $props();

    const agent = getAgent();
    const authManager = getAuthManager();
    const userId = authManager.getTokenInfo()?.userId;
    if (!userId) {
        throw new Error('User ID not found');
    }

    const boardPromise = agent.observeBoardAsync(key);
    const mePromise = agent.observeMeAsync();

    // todo: add user role (internal, external, etc.) and use it instead of board key
    if (key.toUpperCase() === 'SYNC') {
        localStorage.setItem('plausible_ignore', 'true');
    }

    boardHistoryManager.save(key);
</script>

{#await Promise.all([boardPromise, mePromise])}
    <Loading />
{:then [[board, awareness], me]}
    <BoardScreen
        {board}
        {awareness}
        {me}
        counter={counter ? parseInt(counter) : undefined}
    />
{/await}
