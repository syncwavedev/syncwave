<script lang="ts">
    import {onMount} from 'svelte';
    import Loading from '../lib/ui/components/loading.svelte';
    import BoardHistoryManager from '../lib/board-history-manager';
    import router from '../lib/router';
    import {getAgent} from '../lib/agent/agent.svelte';
    import {getAuthManager} from '../lib/utils';

    const agent = getAgent();
    const authManager = getAuthManager();
    const userId = authManager.getTokenInfo()?.userId;
    if (!userId) {
        throw new Error('User ID not found');
    }

    onMount(() => {
        const lastBoardKey = BoardHistoryManager.last();
        if (lastBoardKey) {
            router.route(`/b/${lastBoardKey}`, {replace: true});
        } else {
            agent.observeMeAsync().then(x => {
                if (x.boards.length > 0) {
                    router.route(`/b/${x.boards[0].key}`, {replace: true});
                }
            });
        }
    });
</script>

<Loading />
