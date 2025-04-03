<script module lang="ts">
    import {CancelledError, log, MsgpackCodec, toError} from 'syncwave';

    window.addEventListener('unhandledrejection', event => {
        if (event.reason instanceof CancelledError) {
            event.preventDefault();
        }

        log.error(toError(event.reason), 'unhandled rejection');
    });
</script>

<script lang="ts">
    import {onMount, setContext} from 'svelte';
    import type {Component} from 'svelte';
    import {CoordinatorClient} from 'syncwave';
    import {
        createCoordinatorClient,
        setAuthManager,
        setUploadManager,
    } from './lib/utils.js';
    import ErrorCard from './lib/components/error-card.svelte';
    import {UploadManager} from './lib/upload-manager.svelte';
    import {createThemeManager} from './lib/ui/theme-manager.svelte.js';
    import {createAgent} from './lib/agent/agent.svelte';
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
    import {monitorDocumentActivity} from './document-activity.js';

    monitorDocumentActivity();

    const themeManager = createThemeManager();
    setContext('theme', {
        getTheme: themeManager.getTheme,
        setUserTheme: themeManager.setUserTheme,
    });

    const authManager = new AuthManager();
    setAuthManager(authManager);

    const coordinatorClient = createCoordinatorClient();
    setContext(CoordinatorClient, coordinatorClient);
    setUploadManager(new UploadManager(coordinatorClient));

    createAgent(
        new WsTransportClient({
            url: appConfig.serverWsUrl,
            codec: new MsgpackCodec(),
        }),
        authManager
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let Page = $state<Component<any>>(Loading);
    let pageProps = $state<Record<string, string>>({});

    onMount(() => {
        router.on('/', () => {
            Page = Index;
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
    {#if appConfig.stage === 'local' || appConfig.stage === 'dev'}
        <Page {...pageProps} />
    {:else}
        <svelte:boundary>
            {#snippet failed(error, reset)}
                <ErrorCard {error} {reset} />
            {/snippet}
            <Page {...pageProps} />
        </svelte:boundary>
    {/if}
</main>
