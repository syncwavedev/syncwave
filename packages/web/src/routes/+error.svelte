<script lang="ts">
	import {page} from '$app/state';

    interface PageInfo {
        emoji: string;
		title: string;
		message: string;
    }

	const errorConfig: Record<any, any> = {
		404: {
			emoji: '🤔',
			title: 'Page Not Found',
			message:
				"Hmm... We couldn't find the page you're looking for.<br>It might have been moved or doesn't exist.",
		},
		500: {
			emoji: '😅',
			title: 'Oops!',
			message:
				"Something unexpected happened on our end.<br>Don't worry, our team has been notified and we're working on it!",
		},
		default: {
			emoji: '😕',
			title: 'Something Went Wrong',
			message:
				'We encountered an unexpected error.<br>Please try again later.',
		},
	};

	let error = $derived(errorConfig[page.status] ?? errorConfig.default);
</script>

<svelte:head>
	<title>{error.title}</title>
</svelte:head>

<div class="container">
	<div class="emoji">{error.emoji}</div>
	<h1>{error.title}</h1>
	<p class="message">
		{@html error.message}
	</p>
	<a href="/" class="button">Back to homepage</a>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		min-height: 100vh;
		background-color: #f8f9fa;
		color: #343a40;
	}

	.container {
		height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 2rem;
		max-width: 600px;
		margin: 0 auto;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	h1 {
		font-size: 3rem;
		margin-bottom: 1rem;
		color: #495057;
	}

	.message {
		font-size: 1.2rem;
		line-height: 1.6;
		margin-bottom: 2rem;
		color: #6c757d;
	}

	.emoji {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.button {
		display: inline-block;
		padding: 12px 24px;
		background-color: #339af0;
		color: white;
		text-decoration: none;
		border-radius: 6px;
		transition: background-color 0.2s;
	}

	.button:hover {
		background-color: #228be6;
	}
</style>
