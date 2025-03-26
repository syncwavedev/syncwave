<script lang="ts">
	import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
	import LinkIcon from '../components/icons/link-icon.svelte';
	import TrashIcon from '../components/icons/trash-icon.svelte';
	import TimesIcon from '../components/icons/times-icon.svelte';
	import CircleDashedIcon from '../components/icons/circle-dashed-icon.svelte';
	import UserIcon from '../components/icons/user-icon.svelte';
	import Editor from '../../components/editor.svelte';
	import type {CardView} from '../../agent/view.svelte';
	import type {Awareness} from '../../../../../data/dist/esm/src/awareness';
	import type {User} from 'syncwave-data';
	import {onMount, tick} from 'svelte';
	import HashtagIcon from '../components/icons/hashtag-icon.svelte';

	const {
		card,
		awareness,
		me,
	}: {
		card: CardView;
		awareness: Awareness;
		me: User;
	} = $props();

	let editor: Editor | null = $state(null);

	onMount(() => {
		tick().then(() => {
			if (card.isDraft && editor) {
				editor.focus();
			}
		});
	});
</script>

<div
	class="border-divider bg-subtle-0 dark:bg-subtle-1 z-10 flex w-124 min-w-84 flex-shrink-0 flex-col border-l"
>
	<!-- Scrollable Content Section -->
	<div class="flex-grow overflow-y-auto">
		<!-- Header with Context Menu -->
		<div
			class="bg-subtle-0 dark:bg-subtle-1 border-divider sticky top-0 z-20 flex items-center px-4 py-1"
		>
			<div class="text-xs flex items-baseline gap-1">
				{#if card.isDraft}
					New card
				{:else}
					<span><HashtagIcon /></span>
					<span>{card.counter}</span>
				{/if}
			</div>
			<div class="relative ml-auto">
				<button class="btn--icon" id="ellipsis-button">
					<EllipsisIcon />
				</button>
				<div
					id="context-menu"
					class="bg-subtle-2 border-divider-object absolute right-0 hidden w-46 rounded-lg border p-1"
				>
					<ul>
						<li
							class="hover:bg-subtle-3 flex h-[1.8rem] cursor-pointer items-center gap-1.5 rounded-sm px-2"
						>
							<LinkIcon />
							<span class="text-xs leading-none">Copy Link</span>
						</li>
						<li
							class="hover:bg-subtle-3 text-ink-danger flex h-[1.8rem] cursor-pointer items-center gap-1.5 rounded-sm px-2"
						>
							<TrashIcon />
							<span class="text-xs leading-none">Delete </span>
						</li>
					</ul>
				</div>
			</div>
			<button class="btn--icon" onclick={() => history.back()}>
				<TimesIcon />
			</button>
		</div>
		<div class="mx-4 mt-1">
			<!-- Task Description -->
			<div class="input w-full text-xs leading-relaxed">
				<Editor
					bind:this={editor}
					placeholder="Write here..."
					fragment={card.text.__fragment!}
					{awareness}
					{me}
				/>
			</div>
			<hr class="-mx-4 mt-3 mb-1" />
			<!-- Task Actions -->
			<div class="flex gap-1.5 text-xs">
				<button class="btn--flat">
					<CircleDashedIcon />
					<span class="">{card.column?.name}</span>
				</button>

				<button class="btn--flat">
					<UserIcon />
					<span>Assignee</span>
				</button>
				<!-- <button
					class="btn--block"
					onclick={() => agent.setCardColumn(card.id, board.columns[0].id)}
				>
					To {board.columns[0].name}
				</button> -->
			</div>
			<hr class="-mx-4 mt-1 mb-2" />
		</div>
	</div>
</div>
