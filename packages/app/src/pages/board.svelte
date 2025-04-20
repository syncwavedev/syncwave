<script lang="ts">
    import {BoardId, BusinessError, log} from 'syncwave';
    import {getAgent} from '../lib/agent/agent.svelte';
    import boardHistoryManager from '../lib/board-history-manager';
    import BoardScreen from '../lib/ui/boards/board-screen.svelte';
    import Loading from '../lib/ui/components/loading.svelte';
    import {getAuthManager} from '../lib/utils';

    const {boardId, counter}: {boardId: BoardId; counter?: string} = $props();

    const agent = getAgent();
    const authManager = getAuthManager();
    const userId = authManager.getTokenInfo()?.userId;
    if (!userId) {
        throw new Error('User ID not found');
    }

    const boardPromise = agent.observeBoardAsync(boardId).catch(error => {
        if (
            error instanceof BusinessError &&
            (error.code === 'board_not_found' || error.code === 'forbidden')
        ) {
            log.error({msg: 'Error loading board', error});

            boardHistoryManager.clear();

            window.location.href = '/';
        }

        return Promise.reject(error);
    });
    const mePromise = agent.observeMeAsync();

    // todo: add user role (internal, external, etc.) and use it for plausible ignore

    boardHistoryManager.save(boardId);
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
{:catch}
    <!-- todo: add error screen -->
    <div>Error happened...</div>
{/await}
