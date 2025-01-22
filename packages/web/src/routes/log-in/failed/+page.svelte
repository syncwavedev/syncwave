<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="w-full max-w-md rounded-lg bg-white p-6 text-center">
		<h1 class="text-2xl font-semibold">Unable to Log You In</h1>
		<p class="mt-4 text-gray-700">
			We’re sorry, but we couldn’t log you in. Please try a different sign-in method to access
			your account.
		</p>

		<div class="mt-6 flex justify-center gap-4">
			<Button href="/log-in">Try Again</Button>
			<Button variant="ghost" href="/">Go to Home</Button>
		</div>
	</div>
</div>
