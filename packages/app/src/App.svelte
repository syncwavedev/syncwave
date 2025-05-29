<script module lang="ts">
    import {log, MsgpackCodec} from 'syncwave';

    window.addEventListener('unhandledrejection', event => {
        event.preventDefault();

        log.error({error: event.reason, msg: 'unhandled rejection'});
    });
</script>

<script lang="ts">
    import {onDestroy, setContext} from 'svelte';
    import {CoordinatorClient} from 'syncwave';
    import {
        createCoordinatorClient,
        setAuthManager,
        setUploadManager,
    } from './lib/utils.js';
    import ErrorCard from './lib/ui/components/error-card.svelte';
    import {UploadManager} from './lib/upload-manager.svelte';
    import {createThemeManager} from './lib/ui/theme-manager.svelte.js';
    import {
        createAgent,
        getAgent,
        SvelteComponentContextManager,
    } from './lib/agent/agent.svelte.js';
    import {appConfig} from './config';
    import {WsTransportClient} from './ws-transport-client';
    import {AuthManager} from './auth-manager';

    import {DocumentActivityMonitor} from './document-activity.js';
    import ModalContainer from './lib/ui/components/modal-container.svelte';
    import {PageManager} from './page-manager.svelte.js';
    import Loading from './lib/ui/components/loading.svelte';
    import ToastContainer from './lib/ui/components/toast-container.svelte';

    const documentActivity = new DocumentActivityMonitor();

    onDestroy(() => {
        documentActivity.destroy();
    });

    const themeManager = createThemeManager();
    setContext('theme', {
        getTheme: themeManager.getTheme,
        setUserTheme: themeManager.setUserTheme,
    });

    const authManager = new AuthManager(localStorage);
    setAuthManager(authManager);

    const coordinatorClient = createCoordinatorClient();
    setContext(CoordinatorClient, coordinatorClient);
    setUploadManager(new UploadManager(coordinatorClient));

    createAgent(
        new WsTransportClient({
            url: appConfig.serverWsUrl,
            codec: new MsgpackCodec(),
        }),
        authManager,
        SvelteComponentContextManager,
        documentActivity
    );

    const agent = getAgent();
    const pageManager = new PageManager(agent, authManager);
</script>

<main>
    {#if appConfig.stage === 'local' || appConfig.stage === 'dev'}
        <ToastContainer />
        {#if pageManager.page}
            <ModalContainer />
            <pageManager.page {...pageManager.pageProps} />
        {:else}
            <Loading />
        {/if}
    {:else}
        <svelte:boundary>
            {#snippet failed(error, reset)}
                <ErrorCard {error} {reset} />
            {/snippet}
            <ToastContainer />
            {#if pageManager.page}
                <ModalContainer />
                <pageManager.page {...pageManager.pageProps} />
            {:else}
                <Loading />
            {/if}
        </svelte:boundary>
    {/if}
</main>
