<script lang="ts">
	import {LoaderCircle} from 'lucide-svelte';
	import {Button} from '$lib/components/ui/button/index.js';
	import {Input} from '$lib/components/ui/input/index.js';
	import {Label} from '$lib/components/ui/label/index.js';
	import {cn, getSdk, getUniversalStore, showErrorToast} from '$lib/utils.js';
	import {appConfig} from '$lib/config';
	import AuthHeader from '../../(components)/auth-header.svelte';
	import AuthFooter from '../../(components)/auth-footer.svelte';
	import CircleAlert from 'lucide-svelte/icons/circle-alert';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import {goto} from '$app/navigation';
	import {wait} from 'ground-data';

	const googleSignInUrl = (() => {
		const authState = {redirectUrl: '/'};
		const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
		const options = {
			redirect_uri: `${appConfig.apiUrl}/callbacks/google`,
			client_id: appConfig.googleClientId,
			access_type: 'offline',
			response_type: 'code',
			prompt: 'consent',
			state: '',
			scope: ['https://www.googleapis.com/auth/userinfo.email'].join(' '),
		};

		if (authState) {
			options.state = encodeURIComponent(JSON.stringify(authState));
		}
		return `${rootUrl}?${new URLSearchParams(options).toString()}`;
	})();

	const sdk = getSdk();

	let code = $state('');
	let {data} = $props();
	let {email, redirectUrl} = data;

	let isLoading = $state(false);
	let error: 'invalid_code' | 'code_expired' | 'cooldown' | undefined = $state();

	$effect(() => {
		if (!email) {
			showErrorToast();
			goto(`/log-in?redirectUrl=${encodeURIComponent(redirectUrl ?? '/')}`);
		}
	});

	const store = getUniversalStore();
	async function signIn() {
		isLoading = true;
		error = undefined;
		// wait for a bit for better UX
		await wait(500);
		try {
			const result = await sdk.verifySignInCode(email ?? '', code);
			if (result.type === 'success') {
				store.set('jwt', result.token);

				if (redirectUrl) {
					goto(redirectUrl);
				} else {
					showErrorToast();
				}
			} else {
				error = result.type;
			}
		} finally {
			isLoading = false;
		}
	}

	async function onSubmit(e: Event) {
		e.preventDefault();
		await signIn();
	}

	function onPaste() {
		setTimeout(async () => {
			if (code.length === 6 && (+code).toString() === code) {
				await signIn();
			}
		});
	}
</script>

<div class="container relative flex-col items-center justify-center lg:px-0">
	<AuthHeader />

	<div class="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
		<div class="flex flex-col space-y-2 text-center">
			<h1 class="text-2xl font-semibold tracking-tight">Check your email</h1>
			<p class="text-muted-foreground text-sm">Enter the code sent to {email}</p>
		</div>

		<div class={cn('grid gap-6')}>
			<form onsubmit={onSubmit}>
				<div class="grid gap-2">
					<div class="grid gap-1">
						<Label class="sr-only" for="code">Code</Label>
						<Input
							id="code"
							placeholder="XXXXXX"
							type="text"
							onpaste={onPaste}
							required
							bind:value={code}
							autocapitalize="none"
							pattern="([0-9]|-)+"
							autocomplete="off"
							autocorrect="off"
							disabled={isLoading}
						/>
					</div>
					<Button type="submit" disabled={isLoading}>
						{#if isLoading}
							<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Verify
					</Button>
				</div>
			</form>
		</div>

		{#if error === 'code_expired'}
			<Alert.Root variant="destructive">
				<CircleAlert class="size-4" />
				<Alert.Description
					>Oops! The code for '{email}' has expired. Please request a new one.</Alert.Description
				>
			</Alert.Root>
		{/if}

		{#if error === 'invalid_code'}
			<Alert.Root variant="destructive">
				<CircleAlert class="size-4" />
				<Alert.Description
					>Oops! That code doesn't seem right. Please try again.</Alert.Description
				>
			</Alert.Root>
		{/if}

		{#if error === 'cooldown'}
			<Alert.Root variant="destructive">
				<CircleAlert class="size-4" />
				<Alert.Description
					>Oops! Too many attempts. Please wait a few hours before trying again.</Alert.Description
				>
			</Alert.Root>
		{/if}

		<AuthFooter />
	</div>
</div>
