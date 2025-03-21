<script lang="ts">
	import {
		yFragmentToPlaintext,
		yFragmentToPlaintextAndTaskList,
		yFragmentToTaskList,
	} from '../../richtext';
	import Avatar from '../components/avatar.svelte';
	import type {CardView} from '../../agent/view.svelte';
	import {getAgent} from '../../agent/agent.svelte';
	import {
		DND_TRANSITION_DURATION_MS,
		getDndBoardContext,
		type Ref,
	} from './board-dnd';
	import {getNow} from 'syncwave-data';

	const {
		card,
		onClick,
		active,
	}: {
		card: CardView;
		onClick: () => void;
		active: boolean;
	} = $props();

	let {preview, todoStats} = $derived.by(() => {
		const {text, checked, total} = yFragmentToPlaintextAndTaskList(
			card.text.__fragment!
		);

		return {
			preview: text.split('\n')[0]?.trim() || 'Untitled',
			todoStats: {
				checked,
				total,
			},
		};
	});

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

	const SETTLED_MS = DND_TRANSITION_DURATION_MS / 2;
	let showDndPlaceholder = $state(
		!!card.dndLastChangeAt && getNow() - card.dndLastChangeAt < SETTLED_MS
	);
	$effect(() => {
		if (card.dndLastChangeAt === undefined) return;
		showDndPlaceholder = false;
		console.log(card.dndLastChangeAt);
		const timeoutId = setTimeout(
			() => {
				showDndPlaceholder = true;
			},
			Math.max(0, card.dndLastChangeAt + SETTLED_MS - getNow())
		);

		return () => {
			showDndPlaceholder = false;
			clearTimeout(timeoutId);
		};
	});
</script>

<div
	class="card-container relative"
	bind:this={containerRef}
	data-is-dnd-in-progress={card.dndInProgress}
	data-dnd-settled={showDndPlaceholder}
>
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
	.card-container[data-is-dnd-in-progress='true'] {
		> .overlay {
			position: absolute;
			inset: 5px;
			border-radius: 5px;
			border: 1px solid #ccc;
			background-color: #eee;
			opacity: 0;
		}

		&[data-dnd-settled='true'] > .overlay {
			transition: opacity 0.5s;
			opacity: 0.5;
		}

		> .content {
			opacity: 0;
			pointer-events: none;
		}
	}
</style>
