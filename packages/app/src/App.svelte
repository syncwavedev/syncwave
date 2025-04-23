<script module lang="ts">
    import {log, MsgpackCodec} from 'syncwave';

    window.addEventListener('unhandledrejection', event => {
        event.preventDefault();

        log.error({error: event.reason, msg: 'unhandled rejection'});
    });
</script>

<script lang="ts">
    import {onDestroy, onMount, setContext} from 'svelte';
    import type {Component} from 'svelte';
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
        SvelteComponentContextManager,
    } from './lib/agent/agent.svelte.js';
    import {appConfig} from './lib/config';
    import {WsTransportClient} from './ws-transport-client';
    import {AuthManager} from './auth-manager';
    import router from './lib/router';
    import BoardPage from './pages/board.svelte';
    import LoginCallback from './pages/login-callback.svelte';
    import LoginPage from './pages/login.svelte';
    import Loading from './lib/ui/components/loading.svelte';
    import LoginFailed from './pages/login-failed.svelte';
    import Testbed from './pages/testbed.svelte';
    import Index from './pages/index.svelte';
    import Demo from './pages/demo.svelte';
    import {DocumentActivityMonitor} from './document-activity.js';
    import ModalContainer from './lib/ui/components/modal-container.svelte';

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let Page = $state<Component<any>>(Loading);
    let pageProps = $state<Record<string, string>>({});

    let pageKey = $derived(`${Page.name}-${JSON.stringify(pageProps)}`);
    $effect(() => {
        console.log('pageProps', pageKey);
    });

    onMount(() => {
        router.on('/', () => {
            Page = Index;
        });
        router.on('/demo', () => {
            Page = Demo;
        });
        router.on('/login', () => {
            Page = LoginPage;
        });
        router.on('/login/failed', () => {
            Page = LoginFailed;
        });
        router.on('/login/callback/google', () => {
            Page = LoginCallback;
        });
        router.on('/b/:key', params => {
            Page = BoardPage;
            pageProps = {key: params.key ?? ''};
        });
        router.on('/b/:key/c/:counter', params => {
            Page = BoardPage;
            pageProps = {key: params.key ?? '', counter: params.counter ?? ''};
        });
        router.on('/testbed', () => {
            Page = Testbed;
        });

        router.listen();
    });

    onMount(() => {
        const userId = authManager.getTokenInfo()?.userId;
        if (!userId) {
            router.route(
                `/login?redirect_url=${encodeURIComponent(window.location.href)}`,
                {replace: true}
            );
            return;
        }
    });
</script>

<main>
    {#key pageKey}
        {#if appConfig.stage === 'local' || appConfig.stage === 'dev'}
            <ModalContainer />
            <Page {...pageProps} />
        {:else}
            <svelte:boundary>
                {#snippet failed(error, reset)}
                    <ErrorCard {error} {reset} />
                {/snippet}
                <ModalContainer />
                <Page {...pageProps} />
            </svelte:boundary>
        {/if}
    {/key}
</main>
