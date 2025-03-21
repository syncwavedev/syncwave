<script lang="ts">
	import {yFragmentToPlaintext, yFragmentToTaskList} from '../../richtext';
	import Avatar from '../components/avatar.svelte';
	import type {CardView} from '../../agent/view.svelte';
	import {getAgent} from '../../agent/agent.svelte';
	import {getDndBoardContext, type Ref} from './board-dnd';

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

	let todoStats = $derived(yFragmentToTaskList(card.text.__fragment!));

	const agent = getAgent();

	let containerRef: HTMLDivElement | null = $state(null);
	let cardRef: Ref<CardView> = {value: card};
	$effect(() => {
		cardRef.value = card;
	});

	const context = getDndBoardContext();
	$effect(() => {
		if (containerRef) {
			return context.registerCard({
				card: cardRef,
				container: containerRef,
				cleanups: [],
			});
		}

		return undefined;
	});
</script>

<div class="card-container" bind:this={containerRef}>
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
        border-divider
        p-2
        select-none
        text-xs
        content
	"
		onclick={onClick}
		onmouseenter={() => agent.handleCardMouseEnter(card.boardId, card.id)}
		onmouseleave={() => agent.handleCardMouseLeave(card.boardId, card.id)}
		onkeydown={e => e.key === 'Enter' && onClick()}
	>
		<div class="flex w-full flex-col gap-1 truncate">
			<span class="text-ink truncate">
				{preview}
			</span>
			<div class="flex items-center">
				<span class="text-2xs text-ink-detail mr-auto">
					{#if card.counter}
						#{card.counter}
					{/if}
					by {card.author.fullName}
					{#if card.hoverUsers.length > 0}
						hovers {card.hoverUsers.map(x => x.fullName).join(', ')}
					{/if}
					{#if card.viewerUsers.length > 0}
						viewers {card.viewerUsers
							.map(x => x.fullName)
							.join(', ')}
					{/if}
				</span>
				{#if todoStats.total > 0}
					<span class="text-2xs text-ink-detail ml-auto">
						{todoStats.checked} / {todoStats.total}
					</span>
				{/if}
				<span class="ml-2 text-[1.325rem]">
					<Avatar name={card.author.fullName} />
				</span>
			</div>
		</div>
	</div>
	<div class="overlay"></div>
</div>

<style>
	:global {
		.card-container[data-dnd-placeholder='true'] {
			> .overlay {
				position: absolute;
				inset: 5px;
			}

			> .content {
				opacity: 0;
				pointer-events: none;
			}
		}
	}
</style>
