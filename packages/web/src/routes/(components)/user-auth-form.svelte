<script lang="ts">
	import {LoaderCircle} from 'lucide-svelte';
	import {Button} from '$lib/components/ui/button/index.js';
	import {Input} from '$lib/components/ui/input/index.js';
	import {Label} from '$lib/components/ui/label/index.js';
	import {cn, getSdk} from '$lib/utils.js';
	import {appConfig} from '../../config';

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

	interface Props {
		variant: 'log-in' | 'sign-up';
	}

	const {variant}: Props = $props();
	const titleText = variant === 'log-in' ? 'Welcome back!' : 'Create an account';
	const descText =
		variant === 'log-in'
			? 'Please enter your email to log in'
			: "We're excited to have you! Enter your email to sign up.";

	const sdk = getSdk();

	let email = $state('');

	let isLoading = $state(false);
	async function onSubmit(e: Event) {
		e.preventDefault();

		const timeoutId = setTimeout(() => (isLoading = true), 500);
		try {
			await sdk.sendSignInEmail(email);
		} finally {
			clearTimeout(timeoutId);
			isLoading = false;
		}
	}
</script>

<div class="flex flex-col space-y-2 text-center">
	<h1 class="text-2xl font-semibold tracking-tight">{titleText}</h1>
	<p class="text-muted-foreground text-sm">{descText}</p>
</div>

<div class={cn('grid gap-6')}>
	<form onsubmit={onSubmit}>
		<div class="grid gap-2">
			<div class="grid gap-1">
				<Label class="sr-only" for="email">Email</Label>
				<Input
					id="email"
					placeholder="name@example.com"
					type="email"
					required
					bind:value={email}
					autocapitalize="none"
					autocomplete="email"
					autocorrect="off"
					disabled={isLoading}
				/>
			</div>
			<Button type="submit" disabled={isLoading}>
				{#if isLoading}
					<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				{#if variant === 'log-in'}
					Log in
				{:else}
					Sign up
				{/if}
			</Button>
		</div>
	</form>
	<div class="relative">
		<div class="absolute inset-0 flex items-center">
			<span class="w-full border-t"></span>
		</div>
		<div class="relative flex justify-center text-xs uppercase">
			<span class="bg-background text-muted-foreground px-2"> Or </span>
		</div>
	</div>
	<Button href={googleSignInUrl} variant="outline" type="button" disabled={isLoading}>
		{#if isLoading}
			<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
		{:else}
			<img src="/google.svg" alt="Google" class="mr-2 h-4 w-4" />
		{/if}
		Continue with Google
	</Button>
</div>

<p class="text-muted-foreground px-8 text-center text-sm">
	By clicking continue, you agree to our
	<a href="/terms" class="hover:text-primary underline underline-offset-4"> Terms of Service </a>
	and
	<a href="/privacy" class="hover:text-primary underline underline-offset-4"> Privacy Policy </a>
	.
</p>
