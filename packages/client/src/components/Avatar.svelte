<script lang="ts">
	const {
		title,
		imageUrl
	}: {
		title: string;
		imageUrl?: string;
	} = $props();

	function stringToColor(str: string) {
		const colors = [
			'oklch(60% 0.275 0)',
			'oklch(60% 0.275 18)',
			'oklch(60% 0.275 36)',
			'oklch(60% 0.275 54)',
			'oklch(60% 0.275 72)',
			'oklch(60% 0.275 90)',
			'oklch(60% 0.275 108)',
			'oklch(60% 0.275 126)',
			'oklch(60% 0.275 144)',
			'oklch(60% 0.275 162)',
			'oklch(60% 0.275 180)',
			'oklch(60% 0.275 198)',
			'oklch(60% 0.275 216)',
			'oklch(60% 0.275 234)',
			'oklch(60% 0.275 252)',
			'oklch(60% 0.275 270)',
			'oklch(60% 0.275 288)',
			'oklch(60% 0.275 306)',
			'oklch(60% 0.275 324)',
			'oklch(60% 0.275 342)'
		];

		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}

		return colors[Math.abs(hash) % colors.length];
	}

	const backgroundColor = stringToColor(title);
</script>

{#if imageUrl}
	<img class="avatar-image" src={imageUrl} alt={title} />
{:else}
	<div class="avatar-placeholder font-semibold" style="background-color: {backgroundColor}">
		<span class="avatar-placeholder__letter">{title[0].toUpperCase()}</span>
	</div>
{/if}

<style>
	.avatar-image {
		width: 1em;
		height: 1em;
		border-radius: 50%;

		object-fit: cover;
	}

	.avatar-placeholder__letter {
		font-size: 0.5em;
	}

	.avatar-placeholder {
		width: 1em;
		height: 1em;
		display: flex;
		justify-content: center;
		color: var(--color-always-white);
		align-items: center;
		border-radius: 50%;
	}
</style>
