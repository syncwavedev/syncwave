<script lang="ts">
	const {
		title,
		imageUrl
	}: {
		title: string;
		imageUrl?: string;
	} = $props();

	const avatarColors = [
		{bg: 'lch(57% 16 240)', text: 'lch(100% 0 0)'},
		{bg: 'lch(75% 35 25)', text: 'lch(100% 0 0)'},
		{bg: 'lch(60% 65 40)', text: 'lch(100% 0 0)'},
		{bg: 'lch(70% 50 55)', text: 'lch(100% 0 0)'},
		{bg: 'lch(80% 40 80)', text: 'lch(100% 0 0)'},
		{bg: 'lch(65% 50 135)', text: 'lch(100% 0 0)'},
		{bg: 'lch(70% 35 195)', text: 'lch(100% 0 0)'},
		{bg: 'lch(60% 45 250)', text: 'lch(100% 0 0)'},
		{bg: 'lch(65% 40 290)', text: 'lch(100% 0 0)'}
	];

	function getAvatarColors(str: string) {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}

		const pair = avatarColors[Math.abs(hash) % avatarColors.length];
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
