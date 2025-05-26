<script lang="ts">
    import {AUTH_CODE_LENGTH} from 'syncwave';
    import {getAgent} from '../../agent/agent.svelte';
    import {appConfig} from '../../config.js';
    import router from '../../router';
    import {getRpc, getAuthManager} from '../../utils.js';
    import Envelope from '../components/icons/envelope.svelte';
    import {untrack} from 'svelte';

    const googleSignInUrl = (() => {
        if (!appConfig.googleClientId) {
            return undefined;
        }
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
                router.action(() => {
                    email = '';
                    showCodeInput = false;
                });
                showCodeInput = true;
                startCooldown();
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

    const RESEND_COOLDOWN = 60; // 60 seconds cooldown
    let remainingCooldown = $state(RESEND_COOLDOWN);
    let cooldownInterval: number | undefined = $state(undefined);

    function startCooldown() {
        remainingCooldown = RESEND_COOLDOWN;
        clearInterval(cooldownInterval);
        cooldownInterval = setInterval(() => {
            remainingCooldown--;
            if (remainingCooldown <= 0) {
                clearInterval(cooldownInterval);
            }
        }, 1000) as unknown as number;
    }

    // Start cooldown when component is initialized
    $effect(() => {
        if (showCodeInput) {
            untrack(() => startCooldown());
            return () => clearInterval(cooldownInterval);
        }

        return () => {};
    });

    async function resendCode() {
        if (isLoading || remainingCooldown > 0) return;

        isLoading = true;
        error = undefined;
        try {
            const result = await agent.sendSignInEmail(email.trim());
            if (result.type === 'success') {
                // Reset cooldown timer
                startCooldown();
                code = '';
            } else {
                error = result.type;
            }
        } catch (err) {
            console.error('Failed to resend sign-in email:', err);
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

    const errorMessage: Record<string, string | undefined> = {
        cooldown: 'Too many attempts. Please try again in 15 minutes.',
        invalid_code: 'That code doesn’t seem right. Please try again.',
        code_expired: 'The code has expired. Please request a new one.',
        unknown_error: 'An unknown error occurred. Please try again later.',
        undefined: undefined,
    };
</script>

<div class="flex min-h-screen flex-col bg-material-base">
    <h1 class="ml-4 mt-2 font-semibold text-lg">Syncwave</h1>
    <div class="w-full max-w-2xs text-center mx-auto mt-[23vh]">
        {#if !showCodeInput}
            <h1 class="mb-1 font-extrabold text-xl">Let's get started!</h1>
            <p class="text-ink-detail mb-8">
                {#if googleSignInUrl}
                    Please enter your email to log in or sign up, or continue
                    with Google.
                {:else}
                    Please enter your email to log in or sign up.
                {/if}
            </p>
            <div class="space-y-8">
                {#if googleSignInUrl}
                    <!-- Google Sign-In Button -->
                    <button
                        onclick={() => (window.location.href = googleSignInUrl)}
                        class="btn form-button"
                        type="button"
                        disabled={isLoading}
                        aria-label="Continue with Google"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            xmlns:xlink="http://www.w3.org/1999/xlink"
                            width="16px"
                            height="16px"
                            viewBox="-3 0 262 262"
                            version="1.1"
                        >
                            <g>
                                <path
                                    d="M255.878,133.451 C255.878,122.717 255.007,114.884 253.122,106.761 L130.55,106.761 L130.55,155.209 L202.497,155.209 C201.047,167.249 193.214,185.381 175.807,197.565 L175.563,199.187 L214.318,229.21 L217.003,229.478 C241.662,206.704 255.878,173.196 255.878,133.451"
                                    fill="#4285F4"
                                >
                                </path>
                                <path
                                    d="M130.55,261.1 C165.798,261.1 195.389,249.495 217.003,229.478 L175.807,197.565 C164.783,205.253 149.987,210.62 130.55,210.62 C96.027,210.62 66.726,187.847 56.281,156.37 L54.75,156.5 L14.452,187.687 L13.925,189.152 C35.393,231.798 79.49,261.1 130.55,261.1"
                                    fill="#34A853"
                                >
                                </path>
                                <path
                                    d="M56.281,156.37 C53.525,148.247 51.93,139.543 51.93,130.55 C51.93,121.556 53.525,112.853 56.136,104.73 L56.063,103 L15.26,71.312 L13.925,71.947 C5.077,89.644 0,109.517 0,130.55 C0,151.583 5.077,171.455 13.925,189.152 L56.281,156.37"
                                    fill="#FBBC05"
                                >
                                </path>
                                <path
                                    d="M130.55,50.479 C155.064,50.479 171.6,61.068 181.029,69.917 L217.873,33.943 C195.245,12.91 165.798,0 130.55,0 C79.49,0 35.393,29.301 13.925,71.947 L56.136,104.73 C66.726,73.253 96.027,50.479 130.55,50.479"
                                    fill="#EB4335"
                                >
                                </path>
                            </g>
                        </svg>
                        Continue with Google
                    </button>

                    <hr />
                {/if}

                <!-- Email Form -->
                <form onsubmit={onEmailSubmit} class="space-y-4">
                    <div>
                        <label for="email-input" class="sr-only"
                            >Email address</label
                        >
                        <input
                            id="email-input"
                            type="email"
                            placeholder="Email address"
                            required
                            bind:value={email}
                            class="input input--block form-input"
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
                        class="btn form-button"
                        disabled={isLoading}
                        aria-label="Continue with email"
                    >
                        <Envelope />
                        Continue with email
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
            <h1 class="mb-1 font-extrabold text-2xl">Check your email</h1>
            <p class="text-ink-detail mb-6">
                Enter the {AUTH_CODE_LENGTH}-digit code sent to
                <span class="font-medium">{email}</span>
            </p>
            <form onsubmit={onCodeSubmit} class="space-y-6">
                <div class="mx-auto">
                    <label for="code-input" class="sr-only"
                        >Verification code</label
                    >
                    <!-- svelte-ignore a11y_autofocus -->
                    <input
                        type="text"
                        inputMode="text"
                        maxlength={AUTH_CODE_LENGTH}
                        id="code-input"
                        bind:value={code}
                        class="input input--block form-input text-center"
                        autoFocus
                        disabled={isLoading}
                        placeholder={'•'.repeat(AUTH_CODE_LENGTH)}
                    />
                </div>
                <button
                    type="submit"
                    class="btn form-button"
                    disabled={isLoading}
                    aria-label="Verify code"
                >
                    Verify code and continue
                </button>

                {#if error}
                    <div id="email-error">
                        <div class="text-ink-error text-center text-sm">
                            {errorMessage[error]}
                        </div>
                    </div>
                {/if}

                <div class="text-center">
                    {#if remainingCooldown > 0}
                        <p class="text-sm text-ink-detail">
                            Resend code in {remainingCooldown}s
                        </p>
                    {:else}
                        <button
                            type="button"
                            class="text-primary text-sm underline cursor-pointer"
                            onclick={resendCode}
                            disabled={isLoading}
                        >
                            Didn't receive a code? Send again
                        </button>
                    {/if}
                </div>
            </form>
        {/if}
        <div class="mt-8 mx-auto text-ink-detail text-center">
            By continuing, you acknowledge and accept our <a
                href="https://www.syncwave.dev/terms"
                target="_blank"
                class="text-primary underline">Terms of Service</a
            >
            and
            <a
                href="https://www.syncwave.dev/privacy"
                target="_blank"
                class="text-primary underline">Privacy Policy</a
            >.
        </div>
    </div>
</div>

<style>
    .form-input {
        width: 100%;
        padding-block: 0.625rem;
        padding-inline: 0.5rem;
    }

    .form-button {
        width: 100%;
        background: var(--color-material-1);
        gap: 0.5rem;
        padding-block: 0.6875rem;
        border-radius: var(--radius-sm);

        &:hover {
            background: var(--color-material-1-hover);
        }
    }
</style>
