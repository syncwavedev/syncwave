<script module lang="ts">
	import {browser} from '$app/environment';
	import {CancelledError} from 'syncwave-data';

	if (browser) {
		window.addEventListener('unhandledrejection', event => {
			if (event.reason instanceof CancelledError) {
				event.preventDefault();
			}
		});
	}
</script>

<script lang="ts">
	import '../lib/ui/styles/main.css';
	import {onDestroy, setContext} from 'svelte';
	import {type LayoutProps} from './$types';
	import {ParticipantClient} from 'syncwave-data';
	import {
		createAuthManager,
		createParticipantClient,
		createParticipantClientDummy,
		setAuthManager,
		setUniversalStore,
		setUploadManager,
	} from '$lib/utils';
	import {UniversalStore} from '$lib/universal-store';
	import ErrorCard from '$lib/components/error-card.svelte';
	import {UploadManager} from '$lib/upload-manager.svelte';
	import {createThemeManager} from '$lib/ui/theme-manager.svelte.js';
	import {beforeNavigate} from '$app/navigation';
	import appNavigator from '$lib/ui/app-navigator';

	// Set up theme context
	const themeManager = createThemeManager();
	setContext('theme', {
		getTheme: themeManager.getTheme,
		setUserTheme: themeManager.setUserTheme,
	});

	let {children, data}: LayoutProps = $props();

	// Initialize universal store and auth manager
	const cookieMap = new Map(
		data.serverCookies.map(({name, value}) => [name, value])
	);
	const universalStore = new UniversalStore(cookieMap);
	setUniversalStore(universalStore);
	const authManager = createAuthManager(universalStore);
	setAuthManager(authManager);

	// Participant client setup (no export needed since it's set in context)
	const participantClient = browser
		? createParticipantClient()
		: createParticipantClientDummy();
	setContext(ParticipantClient, participantClient);
	setUploadManager(new UploadManager(participantClient));

	//navigation
	function handleEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			const topItem = appNavigator.peek();
			if (topItem && topItem.onEscape) {
				appNavigator.back();
			}
		}
	}

	beforeNavigate(({cancel}) => {
		if (appNavigator.back()) {
			cancel();
		}
	});

	// Cleanup on component destruction
	onDestroy(() => {
		participantClient.close('layout destroyed');
	});
</script>

<!-- Body-level keydown handler with proper event syntax -->
<svelte:body on:keydown={handleEscape} />

<!-- Error boundary and children rendering -->
<svelte:boundary>
	{#snippet failed(error, reset)}
		<ErrorCard {error} {reset} />
	{/snippet}
	{@render children()}
</svelte:boundary>
