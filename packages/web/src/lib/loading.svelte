<script lang="ts">
	let visible = $state(false);

	$effect(() => {
		const timeoutId = setTimeout(() => {
			visible = true;
		}, 1000);

		return () => {
			clearTimeout(timeoutId);
		};
	});
</script>

{#if visible}
	<div class="flex h-full items-center justify-center">
		<div class="flex flex-col items-center space-y-4">
			<svg
				class="text-primary-500 h-16 w-16 animate-spin"
				fill="none"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<circle
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					stroke-width="4"
				></circle>
				<path
					d="M12 2v4"
					stroke="currentColor"
					stroke-width="4"
					stroke-linecap="round"
				></path>
			</svg>
			<p>Loading...</p>
		</div>
	</div>
{/if}
