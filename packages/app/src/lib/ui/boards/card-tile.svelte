<script lang="ts">
	import {yFragmentToPlaintext} from '$lib/richtext';
	import Avatar from '../components/avatar.svelte';
	import type {CardView} from '$lib/agent/view.svelte';
	import type {Awareness, User} from 'syncwave-data';
	import {observeAwareness} from '$lib/agent/awareness.svelte';

	const {
		card,
		onClick,
		active,
		awareness,
		initialMe,
	}: {
		card: CardView;
		onClick: () => void;
		active: boolean;
		awareness: Awareness;
		initialMe: User;
	} = $props();

	const awarenessStates = observeAwareness(awareness);
	const hovers = $derived.by(() => {
		return [...awarenessStates.values()]
			.filter(
				state =>
					initialMe.id !== state?.userId &&
					state?.hoveredCardId === card.id
			)
			.map(state => (state?.user as any).name);
	});
	const viewers = $derived.by(() => {
		return [...awarenessStates.values()]
			.filter(
				state =>
					initialMe.id !== state?.userId &&
					state?.selectedCardId === card.id
			)
			.map(state => (state?.user as any).name);
	});

	let preview = $derived.by(() => {
		const result = yFragmentToPlaintext(card.text.__fragment!)
			.split('\n')[0]
			?.trim();

		return result || 'Untitled';
	});

	function handleMouseEnter() {
		awareness.setLocalStateField('hoveredCardId', card.id);
	}

	function handleMouseLeave() {
		if (awareness.getLocalState()?.hoveredCardId === card.id) {
			awareness.setLocalStateField('hoveredCardId', null);
		}
	}
</script>

<div
	data-card-id={card.id}
	role="button"
	tabindex="0"
	data-active={active || undefined}
	class="
	bg-subtle-0
	dark:bg-subtle-1
	hover:border-divider
	hover:bg-subtle-2
	group
	data-active:border-divider-active
	data-active:bg-subtle-active
	flex
	cursor-pointer
	items-end
	gap-1
	rounded-md
	border
	border-transparent
	p-2
	"
	onclick={onClick}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	onkeydown={e => e.key === 'Enter' && onClick()}
>
	<div class="flex w-full flex-col gap-1 truncate">
		<span class="text-ink truncate">
			{preview}
		</span>
		<div class="flex items-center">
			<span class="text-2xs text-ink-detail">
				{#if card.counter}
					#{card.counter}
				{/if}
				by {card.author.fullName}
				{#if hovers.length > 0}
					hovers: {hovers.join(', ')}
				{/if}
				{#if viewers.length > 0}
					viewers: {viewers.join(', ')}
				{/if}
			</span>
			<span class="ml-auto text-[1.325rem]">
				<Avatar name={card.author.fullName} />
			</span>
		</div>
	</div>
</div>
