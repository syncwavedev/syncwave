<script lang="ts">
    import {getAgent} from '../lib/agent/agent.svelte';
    import {getAuthManager} from '../lib/utils';

    const authManager = getAuthManager();
    getAgent()
        .getDemoData()
        .then(x => {
            authManager.logIn(x.jwt, {pageReload: false});
            window.location.href = `/b/${x.boardId}`;
        });
</script>
