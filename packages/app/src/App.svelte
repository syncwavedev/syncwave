<script module lang="ts">
	import {CancelledError, MsgpackCodec} from 'syncwave-data';

	window.addEventListener('unhandledrejection', event => {
		if (event.reason instanceof CancelledError) {
			event.preventDefault();
		}
	});
</script>

<script lang="ts">
	import './lib/ui/styles/main.css';
	import {onDestroy, setContext} from 'svelte';
	import LoginScreen from './lib/ui/login/login-screen.svelte';
	import {CoordinatorClient} from 'syncwave-data';
	import {
		createCoordinatorClient,
		setAuthManager,
		setUploadManager,
	} from './lib/utils.js';
	import ErrorCard from './lib/components/error-card.svelte';
	import {UploadManager} from './lib/upload-manager.svelte';
	import {createThemeManager} from './lib/ui/theme-manager.svelte.js';
	import appNavigator from './lib/ui/app-navigator';
	import {createAgent} from './lib/agent/agent.svelte';
	import {appConfig} from './lib/config';
	import {WsTransportClient} from './ws-transport-client';
	import {AuthManager} from './auth-manager';

	// Set up theme context
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

	function handleEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			const topItem = appNavigator.peek();
			if (topItem && topItem.onEscape) {
				appNavigator.back();
			}
		}
	}

	onDestroy(() => {
		coordinatorClient.close('layout destroyed');
	});
</script>

<svelte:body on:keydown={handleEscape} />

<main>
	<svelte:boundary>
		{#snippet failed(error, reset)}
			<ErrorCard {error} {reset} />
		{/snippet}
		<LoginScreen />
	</svelte:boundary>
</main>
