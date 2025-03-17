<script lang="ts">
	import {getAgent} from '../../agent/agent.svelte';
	import {appConfig} from '../../config.js';
	import {getRpc, getAuthManager} from '../../utils.js';

	const googleSignInUrl = (() => {
		const authState = {redirectUrl: '/'};
		const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
		const options = {
			redirect_uri: `${appConfig.apiUrl}/callbacks/google`,
			client_id: appConfig.googleClientId,
			access_type: 'offline',
			response_type: 'code',
			prompt: 'consent',
			state: encodeURIComponent(JSON.stringify(authState)),
			scope: 'https://www.googleapis.com/auth/userinfo.email',
		};
		return `${rootUrl}?${new URLSearchParams(options).toString()}`;
	})();

	const agent = getAgent();
	const rpc = getRpc();
	const authManager = getAuthManager();

	let email = $state('');
	let code = $state('');
	let showCodeInput = $state(false);
	let error = $state<string | undefined>(undefined);
	let isLoading = $state(false);

	async function onEmailSubmit(e: Event) {
		e.preventDefault();
		if (isLoading) return;
		isLoading = true;
		error = undefined;
		try {
			const result = await agent.sendSignInEmail(email.trim());
			if (result.type === 'success') {
				showCodeInput = true;
			} else {
				error = result.type;
			}
		} catch (err) {
			console.error('Failed to send sign-in email:', err);
			error = 'unknown_error';
		} finally {
			isLoading = false;
		}
	}

	async function onCodeSubmit(e: Event) {
		e.preventDefault();
		if (isLoading) return;
		isLoading = true;
		error = undefined;
		try {
			const result = await rpc(x => x.verifySignInCode({email, code}));
			if (result.type === 'success' && result.token) {
				authManager.logIn(result.token);
				window.location.href = '/';
			} else {
				error = result.type;
			}
		} catch (err) {
			console.error('Failed to verify code:', err);
			error = 'unknown_error';
		} finally {
			isLoading = false;
		}
	}

	function onPaste() {
		if (code.length === 6 && /^\d{6}$/.test(code)) {
			void onCodeSubmit(new Event('submit'));
		}
	}

	const errorMessage: Record<string, string | undefined> = {
		cooldown: 'Too many attempts. Please try again later.',
		invalid_code: 'That code doesn’t seem right. Please try again.',
		code_expired: 'The code has expired. Please request a new one.',
		unknown_error: 'An unknown error occurred. Please try again later.',
		undefined: undefined,
	};
</script>

<div class="bg-subtle-1 flex min-h-screen flex-col items-center justify-center">
	<div class="bg-subtle-0 border-divider w-full max-w-md rounded-lg border p-6">
		<h1 class="mb-4 text-center text-xl font-extrabold">Sign in to Syncwave</h1>
		{#if !showCodeInput}
			<div class="space-y-4">
				<!-- Google Sign-In Button -->
				<button
					onclick={() => (window.location.href = googleSignInUrl)}
					class="bg-subtle-1 w-full rounded-lg p-2"
					type="button"
					disabled={isLoading}
					aria-label="Continue with Google"
				>
					{#if isLoading}
						<span class="inline-block animate-spin">↻</span>
					{:else}
						Continue with Google
					{/if}
				</button>

				<!-- Separator -->
				<div class="relative">
					<div class="absolute inset-0 flex items-center">
						<span class="border-subtle-3 w-full border-t"></span>
					</div>
					<div class="relative flex justify-center text-xs uppercase">
						<span class="text-ink-detail bg-subtle-0 px-2">or</span>
					</div>
				</div>

				<!-- Email Form -->
				<form onsubmit={onEmailSubmit} class="space-y-4">
					<div>
						<label for="email-input" class="sr-only">Email address</label>
						<input
							id="email-input"
							type="email"
							placeholder="Email address"
							required
							bind:value={email}
							class="input bg-subtle-0 border-divider rounded-lg border p-2"
							autocapitalize="none"
							autocomplete="email"
							autocorrect="off"
							disabled={isLoading}
							aria-describedby={error === 'cooldown'
								? 'email-error'
								: undefined}
						/>
					</div>
					<button
						type="submit"
						class="bg-subtle-3 p-2"
						disabled={isLoading}
						aria-label="Continue with Email"
					>
						{#if isLoading}
							<span class="inline-block animate-spin">↻</span>
						{:else}
							Continue with Email
						{/if}
					</button>
					{#if error}
						<div id="email-error">
							<div class="text-ink-error text-center text-sm">
								{errorMessage[error]}
							</div>
						</div>
					{/if}
				</form>
			</div>
		{:else}
			<div class="flex flex-col space-y-2 text-center">
				<h1 class="text-2xl font-semibold tracking-tight">Check your email</h1>
				<p class="text-muted-foreground text-sm">
					Enter the 6-digit code sent to <span class="font-medium">{email}</span
					>
				</p>
			</div>
			<form onsubmit={onCodeSubmit} class="mt-6 space-y-6">
				<div>
					<label for="code-input" class="sr-only">Verification code</label>
					<input
						id="code-input"
						type="text"
						placeholder="XXXXXX"
						required
						bind:value={code}
						onpaste={onPaste}
						class="dark:bg-subtle-2 border-subtle-3 focus:ring-accent-primary w-full rounded-lg border px-4 py-3 text-center text-sm tracking-widest focus:ring-2 focus:outline-none disabled:opacity-50"
						maxlength="6"
						inputmode="numeric"
						autocomplete="one-time-code"
						autocorrect="off"
						disabled={isLoading}
						aria-describedby={error ? 'code-error' : undefined}
					/>
				</div>
				<button
					type="submit"
					class="bg-subtle-3 p-2"
					disabled={isLoading}
					aria-label="Verify code"
				>
					{#if isLoading}
						<span class="inline-block animate-spin">↻</span>
					{:else}
						Verify
					{/if}
				</button>
				{#if error}
					<div id="email-error">
						<div class="text-ink-error text-center text-sm">
							{errorMessage[error]}
						</div>
					</div>
				{/if}
			</form>
		{/if}
	</div>
</div>
