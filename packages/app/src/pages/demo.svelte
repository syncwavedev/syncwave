<script lang="ts">
    import {getAgent} from '../lib/agent/agent.svelte';
    import {getAuthManager} from '../lib/utils';

    const authManager = getAuthManager();

    if (authManager.authorized) {
        if (
            !confirm(
                'You are already logged in. Do you want to log out and start a demo?'
            )
        ) {
            window.location.href = '/';
        }
    }

    getAgent()
        .getDemoData()
        .then(x => {
            authManager.logIn(x.jwt, {pageReload: false});
            window.location.href = `/b/${x.boardId}`;
        });
</script>
