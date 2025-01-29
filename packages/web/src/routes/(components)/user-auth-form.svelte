<script lang="ts">
	import {CircleAlert, LoaderCircle} from 'lucide-svelte';
	import {Button} from '$lib/components/ui/button/index.js';
	import {Input} from '$lib/components/ui/input/index.js';
	import {Label} from '$lib/components/ui/label/index.js';
	import {cn, getSdk} from '$lib/utils.js';
	import {appConfig} from '../../lib/config';
	import AuthFooter from './auth-footer.svelte';
	import {goto} from '$app/navigation';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import {Context} from 'ground-data';

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
		redirectUrl: string;
	}

	const {variant, redirectUrl}: Props = $props();
	const titleText = variant === 'log-in' ? 'Welcome back!' : 'Create an account';
	const descText =
		variant === 'log-in'
			? 'Please enter your email to log in'
			: "We're excited to have you! Enter your email to sign up.";

	const sdk = getSdk();

	let email = $state('');
	let error: 'cooldown' | undefined = $state();

	let isLoading = $state(false);
	async function onSubmit(e: Event) {
		e.preventDefault();
		isLoading = true;
		error = undefined;
		try {
			const result = await sdk.sendSignInEmail(Context.todo(), email);
			if (result.type === 'success') {
				goto(
					`/log-in/code?redirectUrl=${encodeURIComponent(redirectUrl)}&email=${encodeURIComponent(email)}`
				);
			} else {
				error = result.type;
			}
		} finally {
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

	{#if error === 'cooldown'}
		<Alert.Root variant="destructive">
			<CircleAlert class="size-4" />
			<Alert.Description
				>Oops! Too many attempts. Please wait a few hours before trying again.</Alert.Description
			>
		</Alert.Root>
	{/if}

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

<AuthFooter />
