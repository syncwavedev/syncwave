<script lang="ts">
	const {percentage}: {percentage?: number} = $props();

	let activeColor = $state('var(--color-subtle-3)');
	if (percentage !== undefined) {
		if (percentage == 100) {
			activeColor = 'var(--color-success)';
		} else if (percentage > 0) {
			activeColor = 'var(--color-pending)';
		}
	}
</script>

<svg
	viewBox="0 0 24 24"
	width="24"
	height="24"
	fill="none"
	class="icon"
	xmlns="http://www.w3.org/2000/svg"
>
	<circle
		class="progress-track"
		cx="12"
		cy="12"
		r="10"
		stroke={'var(--color-subtle-3)'}
		stroke-width="1.5"
		fill="none"
	/>

	<circle class="progress-track" cx="12" cy="12" r="6" fill={activeColor} />
	{#if percentage}
		<circle
			class="progress-circle"
			cx="12"
			cy="12"
			r="10"
			stroke={percentage < 100 ? 'var(--color-pending)' : 'var(--color-success)'}
			stroke-width="1.5"
			fill="none"
			stroke-dasharray={20 * Math.PI}
			stroke-dashoffset={(100 - percentage) * (20 * Math.PI) * 0.01}
			style="transform: rotate(-90deg); transform-origin: 50% 50%;"
		/>
	{/if}
</svg>
