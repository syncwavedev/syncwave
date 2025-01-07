<script lang="ts">
	const {percentage}: {percentage?: number} = $props();
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
		stroke-width="2"
		fill="none"
	/>
	{#if percentage}
		<circle
			class="progress-circle"
			cx="12"
			cy="12"
			r="10"
			stroke="currentColor"
			stroke-width="2"
			fill="none"
			stroke-dasharray={63 * Math.PI}
			stroke-dashoffset={(100 - percentage) * (63 * Math.PI) * 0.01}
			style="transform: rotate(-90deg); transform-origin: 50% 50%;"
		/>
	{/if}
</svg>
