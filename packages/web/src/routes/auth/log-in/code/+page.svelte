<script lang="ts">
	import {getSdk, getAuthManager, showErrorToast} from '$lib/utils.js';
	import {appConfig} from '$lib/config';
	import AuthHeader from '../../auth-header.svelte';
	import AuthFooter from '../../auth-footer.svelte';
	import {goto} from '$app/navigation';

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
	let error: 'invalid_code' | 'code_expired' | 'cooldown' | undefined =
		$state();

	$effect(() => {
		if (!email) {
			showErrorToast();
			goto(
				`/auth/log-in?redirectUrl=${encodeURIComponent(redirectUrl ?? '/')}`
			);
		}
	});

	const store = getAuthManager();
	async function signIn() {
		isLoading = true;
		error = undefined;
		try {
			const result = await sdk(x =>
				x.verifySignInCode({email: email ?? '', code})
			);
			if (result.type === 'success') {
				store.logIn(result.token);

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

<div class="relative container flex-col items-center justify-center lg:px-0">
	<AuthHeader />

	<div
		class="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]"
	>
		<div class="flex flex-col space-y-2 text-center">
			<h1 class="text-2xl font-semibold tracking-tight">
				Check your email
			</h1>
			<p class="text-muted-foreground text-sm">
				Enter the code sent to {email}
			</p>
		</div>

		<div class="grid gap-6">
			<form onsubmit={onSubmit}>
				<div class="grid gap-2">
					<div class="grid gap-1">
						<label class="sr-only" for="code">Code</label>
						<input
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
					<button type="submit" disabled={isLoading}> Verify </button>
				</div>
			</form>
		</div>

		{#if error === 'code_expired'}
			<div>
				<div>
					Oops! The code for '{email}' has expired. Please request a
					new one.
				</div>
			</div>
		{/if}

		{#if error === 'invalid_code'}
			<div>
				<div>Oops! That code doesn't seem right. Please try again.</div>
			</div>
		{/if}

		{#if error === 'cooldown'}
			<div>
				<div>
					Oops! Too many attempts. Please wait a few hours before
					trying again.
				</div>
			</div>
		{/if}

		<AuthFooter />
	</div>
</div>
