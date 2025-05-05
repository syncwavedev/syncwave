<script lang="ts">
    import {log} from 'syncwave';
    import {getAgent} from '../lib/agent/agent.svelte';
    import boardHistoryManager from '../lib/board-history-manager';
    import BoardScreen from '../lib/ui/boards/board-screen.svelte';
    import Loading from '../lib/ui/components/loading.svelte';
    import {getAuthManager} from '../lib/utils';
    import PermissionBoundary from '../lib/ui/components/permission-boundary.svelte';

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

    // todo: add user role (internal, external, etc.) and use it instead of board key
    if (key.toLowerCase() === '767e719e9b3b4b52b0aaa8c64eca539f') {
        localStorage.setItem('plausible_ignore', 'true');
    }

    boardHistoryManager.save(key);
</script>

{#await Promise.all([boardPromise, mePromise])}
    <Loading />
{:then [[board, awareness, boardMeView], me]}
    <PermissionBoundary member={boardMeView}>
        <BoardScreen
            {board}
            {awareness}
            {me}
            {boardMeView}
            counter={counter ? parseInt(counter) : undefined}
        />
    </PermissionBoundary>
{:catch}
    <div>Board not found. Redirecting to home page...</div>
{/await}
