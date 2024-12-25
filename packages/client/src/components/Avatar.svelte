<script lang="ts">
	const {
		title,
		imageUrl
	}: {
		title: string;
		imageUrl?: string;
	} = $props();

	const colorPairs = [
		{bg: 'lch(88% 34 10)', text: 'lch(0% 0 0)'},
		{bg: 'lch(84% 28 50)', text: 'lch(0% 0 0)'},
		{bg: 'lch(86% 33 125)', text: 'lch(0% 0 0)'},
		{bg: 'lch(82% 25 170)', text: 'lch(0% 0 0)'},
		{bg: 'lch(90% 30 210)', text: 'lch(0% 0 0)'},
		{bg: 'lch(87% 36 260)', text: 'lch(0% 0 0)'},
		{bg: 'lch(85% 27 320)', text: 'lch(0% 0 0)'}
	];

	function getAvatarColors(str: string) {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}

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
		inline-size: var(--btn-size);
		block-size: var(--btn-size);
		border-radius: 50%;

		object-fit: cover;
	}

	.avatar-placeholder__letter {
		font-size: max(var(--btn-size) * 0.45, 14px);
	}

	.avatar-placeholder {
		inline-size: var(--btn-size);
		block-size: var(--btn-size);
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: 50%;
	}
</style>
