<script lang="ts">
	import {getAgent} from '../../agent/agent.svelte';
	import {appConfig} from '../../config.js';

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

	const agent = getAgent();

	let email = $state('');
	let error: 'cooldown' | undefined = $state();
	let isLoading = $state(false);

	async function onSubmit(e: Event) {
		e.preventDefault();
		isLoading = true;
		error = undefined;
		try {
			const result = await agent.sendSignInEmail(email);
			if (result.type === 'success') {
				window.location.href = `/auth/log-in/code?redirectUrl=/&email=${encodeURIComponent(email)}`;
			} else {
				error = result.type;
			}
		} finally {
			isLoading = false;
		}
	}
</script>

<div
	class="dark:bg-subtle-0 bg-subtle-1 flex min-h-screen flex-col items-center justify-center"
>
	<div class="bg-subtle-0 dark:bg-subtle-1 w-96 max-w-md rounded-lg p-8">
		<h1 class="mb-6 text-center text-2xl font-semibold">Welcome back</h1>

		<div class="space-y-4">
			<button
				onclick={() => (window.location.href = googleSignInUrl)}
				class="bg-subtle-2 hover:bg-subtle-3 flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-medium"
				type="button"
				disabled={isLoading}
			>
				Continue with Google
			</button>

			<div class="relative">
				<div class="absolute inset-0 flex items-center">
					<span class="border-subtle-3 w-full border-t"></span>
				</div>
				<div class="relative flex justify-center text-xs">
					<span class="bg-subtle-0 dark:bg-subtle-1 text-ink-detail px-2"
						>or</span
					>
				</div>
			</div>

			<form onsubmit={onSubmit} class="space-y-4">
				<div>
					<input
						type="email"
						placeholder="Email address"
						required
						bind:value={email}
						class="dark:bg-subtle-2 border-subtle-3 w-full rounded-lg border px-4 py-3 text-sm"
						autocapitalize="none"
						autocomplete="email"
						autocorrect="off"
						disabled={isLoading}
					/>
				</div>

				<button
					type="submit"
					class="bg-accent-primary hover:bg-accent-primary-hover flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white"
					disabled={isLoading}
				>
					Continue with Email
				</button>

				{#if error === 'cooldown'}
					<div class="text-ink-error text-center text-sm">
						Too many attempts. Please try again later.
					</div>
				{/if}
			</form>
		</div>
	</div>
</div>
