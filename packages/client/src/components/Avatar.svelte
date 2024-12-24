<script lang="ts">
	const {
		title,
		imageUrl
	}: {
		title: string;
		imageUrl?: string;
	} = $props();

	const colorPairs = [
		// Glassy pink with deeper rose text
		{bg: 'oklch(92% 0.12 20 / 0.85)', text: 'oklch(35% 0.22 20)'},
		// Frosted emerald with deep forest text
		{bg: 'oklch(88% 0.15 150 / 0.85)', text: 'oklch(35% 0.25 150)'},
		// Glassy violet with rich purple text
		{bg: 'oklch(90% 0.12 280 / 0.85)', text: 'oklch(35% 0.22 280)'},
		// Crystalline amber with deep copper text
		{bg: 'oklch(90% 0.15 50 / 0.85)', text: 'oklch(35% 0.25 50)'},
		// Frosted azure with deep ocean text
		{bg: 'oklch(90% 0.12 230 / 0.85)', text: 'oklch(35% 0.22 230)'},
		// Glassy teal with deep turquoise text
		{bg: 'oklch(88% 0.15 190 / 0.85)', text: 'oklch(35% 0.25 190)'}
	];

	function getAvatarColors(str: string) {
		// Produce a hash from the string so we can pick a color pair
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}

		// Pick from our list of pairs
		const pair = colorPairs[Math.abs(hash) % colorPairs.length];
		return {bgColor: pair.bg, textColor: pair.text};
	}

	const {bgColor, textColor} = getAvatarColors(title);
</script>

{#if imageUrl}
	<img class="avatar-image" src={imageUrl} alt={title} />
{:else}
	<div
		class="avatar-placeholder font-semibold"
		style="
			background-color: {bgColor};
			color: {textColor};
		"
	>
		<span class="avatar-placeholder__letter">
			{title[0].toUpperCase()}
		</span>
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
		font-size: max(0.4em, 15px);
	}

	.avatar-placeholder {
		width: 1em;
		height: 1em;
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: 50%;
	}
</style>
