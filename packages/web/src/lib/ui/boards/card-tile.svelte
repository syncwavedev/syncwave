<script lang="ts">
	import {yFragmentToPlaintext} from '$lib/richtext';
	import Avatar from '../components/avatar.svelte';
	import type {CardView} from '$lib/sdk/view.svelte';

	const {
		card,
		onClick,
		active,
	}: {
		card: CardView;
		onClick: () => void;
		active: boolean;
	} = $props();

	let preview = $derived.by(() => {
		const result = yFragmentToPlaintext(card.text.__fragment!)
			.split('\n')[0]
			?.trim();

		return result || 'Untitled';
	});
</script>

<div
	data-card-id={card.id}
	role="button"
	tabindex="0"
	data-active={active || undefined}
	class="
	bg-subtle-0
	dark:bg-subtle-1
	hover:bg-subtle-3
	group
	border-divider
	data-active:border-divider-object
	data-active:bg-subtle-4
	flex
	cursor-pointer
	items-end
	gap-1
	rounded-md
	border
	p-2
	"
	onclick={onClick}
	onkeydown={e => e.key === 'Enter' && onClick()}
>
	<div class="flex w-full flex-col gap-1 truncate">
		<span class="text-ink truncate">
			{preview}
		</span>
		<span class="text-2xs text-ink-detail"
			>#{card.counter} by {card.author.fullName}
		</span>
	</div>
	<div class="">
		<span class="text-[1.325rem]">
			<Avatar name={card.author.fullName} />
		</span>
		<!-- <button class="btn--icon btn-sm">{{template "user.html" }}</button> -->
	</div>
</div>
