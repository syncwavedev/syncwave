<script lang="ts">
    import {log} from 'syncwave';
    import {getAgent} from '../lib/agent/agent.svelte';
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

    const boardPromise = agent.observeBoardAsync(key).catch(error => {
        log.error({msg: 'Error loading board', error});

        boardHistoryManager.clear();

        window.location.href = '/';

        return Promise.reject(error);
    });
    const mePromise = agent.observeMeAsync();

    boardHistoryManager.save(key);
</script>

{#await Promise.all([boardPromise, mePromise])}
    <Loading />
{:then [[board, awareness, boardMeView], me]}
    <BoardScreen
        {board}
        {awareness}
        {me}
        {boardMeView}
        counter={counter ? parseInt(counter) : undefined}
    />
{:catch}
    <div>Board not found. Redirecting to home page...</div>
{/await}
